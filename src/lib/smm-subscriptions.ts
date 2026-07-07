import { db } from "@/lib/db";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";
import { createNotification } from "@/lib/notify";

/**
 * SMM subscription worker — periodic check for new posts.
 *
 * In production, this would call the platform's Graph API (Instagram, TikTok,
 * YouTube, etc.) with the subscription's `username` to list recent posts and
 * diff against `lastPostUrl`. Since the sandbox has no provider API access, we
 * SIMULATE the new-post detection with a 30% probability per check pass.
 *
 * When a "new post" is detected:
 *   1. Generate a fake post URL (https://instagram.com/p/Cxxxxxxxx) for dedup
 *   2. Pick a random quantity in [minQuantity, maxQuantity]
 *   3. Create an Order with status=processing and totalPrice=0 (the balance
 *      was already debited at subscription-creation time — the auto-order is a
 *      zero-charge ledger entry that reuses the same fulfillment pipeline as
 *      regular orders)
 *   4. Bump postsProcessed; if postsProcessed >= posts → mark the subscription
 *      as "completed"
 *   5. Enqueue an order.fulfill job so the new order flows through the normal
 *      fulfillment worker (provider sync, progress updates, notifications)
 *
 * Throttling: each subscription is checked at most once every 5 minutes — the
 * `lastCheckedAt` gate keeps the DB query cheap and prevents the worker from
 * re-detecting the same post on every tick.
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const NEW_POST_PROBABILITY = 0.30;

/**
 * Generates a fake post URL for dedup purposes.
 * Format: https://instagram.com/p/Cxxxxxxxx (10 random alphanumeric chars).
 */
function makeFakePostUrl(platform: string, username: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  const host =
    platform.toLowerCase().includes("tiktok") ? "tiktok.com"
    : platform.toLowerCase().includes("youtube") ? "youtube.com"
    : platform.toLowerCase().includes("x") || platform.toLowerCase().includes("twitter") ? "x.com"
    : "instagram.com";
  return `https://${host}/${username}/p/${id}`;
}

/**
 * Picks a random integer in [min, max] inclusive.
 */
function randomQuantity(min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Run one check pass over all due SMM subscriptions.
 *
 * @returns { checked, ordersCreated } — counters for observability / metrics.
 */
export async function checkSmmSubscriptions(): Promise<{
  checked: number;
  ordersCreated: number;
}> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - CHECK_INTERVAL_MS);

  // ── Pull all subscriptions that are due for a check ──
  // Conditions:
  //   - status = "active"
  //   - expiry is in the future (not yet expired)
  //   - postsProcessed < posts (still has budget for more posts)
  //   - lastCheckedAt is null OR older than 5 minutes ago
  //
  // NOTE: Prisma doesn't support field-to-field comparisons in `where`
  // (e.g. postsProcessed < posts), so we fetch with the other conditions and
  // filter the remaining one in JS. In practice the active/completed status
  // transition already handles this — once postsProcessed reaches posts the
  // subscription is marked completed and filtered out by `status: "active"`.
  // The JS filter is a belt-and-braces safety against any race.
  //
  // Cap at 200 per pass to keep the worker bounded — if there are more, the
  // next tick will pick them up.
  const raw = await db.smmSubscription.findMany({
    where: {
      status: "active",
      expiry: { gt: now },
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lt: cutoff } },
      ],
    },
    take: 200,
    select: {
      id: true,
      publicId: true,
      userId: true,
      serviceId: true,
      serviceName: true,
      platform: true,
      username: true,
      minQuantity: true,
      maxQuantity: true,
      posts: true,
      postsProcessed: true,
      lastPostUrl: true,
    },
  });
  const subscriptions = raw.filter((s) => s.postsProcessed < s.posts);

  let ordersCreated = 0;

  for (const sub of subscriptions) {
    try {
      // ── Mark as checked immediately so a concurrent worker can't pick it up ──
      // We update lastCheckedAt first; if the post detection / order creation
      // fails below, the subscription still gets re-checked on the next tick.
      await db.smmSubscription.update({
        where: { id: sub.id },
        data: { lastCheckedAt: now },
      });

      // ── SIMULATE new post detection ──
      // In production: call provider Graph API with `username`, list recent
      // posts, find any post URL not equal to lastPostUrl. If found, treat the
      // newest one as the "new post" and use its URL for dedup.
      const postDetected = Math.random() < NEW_POST_PROBABILITY;
      if (!postDetected) continue;

      const postUrl = makeFakePostUrl(sub.platform, sub.username);

      // ── Dedup: skip if it's the same as the last detected post ──
      if (postUrl === sub.lastPostUrl) continue;

      // ── Pick a random quantity in [minQuantity, maxQuantity] ──
      const quantity = randomQuantity(sub.minQuantity, sub.maxQuantity);

      // ── Create an Order with totalPrice=0 (pre-paid at subscription creation) ──
      const orderPublicId = await nextPublicId("A", 10432);

      const order = await db.order.create({
        data: {
          publicId: orderPublicId,
          userId: sub.userId,
          serviceId: sub.serviceId,
          serviceName: sub.serviceName,
          platform: sub.platform,
          quantity,
          // Zero charge — the balance was already debited at subscription
          // creation time. Recording zero on the order keeps the ledger clean
          // (no second debit) while still flowing through fulfillment.
          unitCost: 0,
          unitPrice: 0,
          totalCost: 0,
          totalPrice: 0,
          profit: 0,
          status: "processing",
          progress: 5,
          priority: "standard",
          link: postUrl,
          eta: "2m",
          flag: "🌍",
        },
      });

      // ── Bump postsProcessed; mark completed if we've covered all posts ──
      const newPostsProcessed = sub.postsProcessed + 1;
      const isComplete = newPostsProcessed >= sub.posts;

      await db.smmSubscription.update({
        where: { id: sub.id },
        data: {
          lastPostUrl: postUrl,
          postsProcessed: newPostsProcessed,
          ...(isComplete ? { status: "completed" as const } : {}),
        },
      });

      // ── Enqueue fulfillment so the new order flows through normal pipeline ──
      enqueueJob("order.fulfill", {
        orderId: order.id,
        userId: sub.userId,
      }).catch((e) =>
        console.error("[smm-subscription] enqueue fulfill failed:", e),
      );

      // ── Notify the user that a new post was auto-delivered ──
      await createNotification({
        userId: sub.userId,
        type: "order",
        title: `Auto-order placed for @${sub.username}`,
        message: `Subscription ${sub.publicId} — ${sub.serviceName} delivered to new post (${quantity.toLocaleString()} units). Post ${newPostsProcessed}/${sub.posts}.`,
        severity: "info",
      });

      if (isComplete) {
        await createNotification({
          userId: sub.userId,
          type: "order",
          title: `Subscription ${sub.publicId} completed ✅`,
          message: `All ${sub.posts} posts have been delivered for @${sub.username}.`,
          severity: "success",
        });
      }

      ordersCreated++;
    } catch (e) {
      console.error(`[smm-subscription] error processing ${sub.id}:`, e);
      // Continue with the next subscription — one failure shouldn't abort the
      // whole pass.
    }
  }

  return { checked: subscriptions.length, ordersCreated };
}
