import { db } from "@/lib/db";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";
import { createNotification } from "@/lib/notify";

/**
 * Auto-refill worker — periodic check for delivery drops on completed orders.
 *
 * SMM panels typically guarantee refills within a window (e.g. 30 days) — if
 * the delivered count drops (e.g. likes get removed by Instagram's spam
 * filters), the user is entitled to a free re-delivery.
 *
 * In production, this worker would query the provider API to compare the
 * current delivered count vs the originally completed count. Since the sandbox
 * has no provider API access, we SIMULATE the drop detection with a 5%
 * probability per check pass.
 *
 * When a drop is detected on a completed order:
 *   1. Skip if there's already an open/auto refill ticket for that order
 *      (subject `[Refill] {publicId}` or `[AutoRefill] {publicId}`) — one
 *      active refill at a time.
 *   2. Create a Ticket with subject `[AutoRefill] {order.publicId}` and a
 *      message describing the auto-detected drop.
 *   3. Enqueue an `order.fulfill` job with `isRefill: true` so the fulfillment
 *      worker re-runs delivery for this order.
 *   4. Notify the user.
 *
 * Scope: orders completed within the last 30 days. Older orders are out of the
 * refill window — the manual refill button in the dashboard still works but
 * the auto-checker skips them.
 */

const REFILL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DROP_PROBABILITY = 0.05; // 5% per check pass

/**
 * Run one auto-refill check pass over recently-completed orders.
 *
 * @returns { checked, refillsRequested } — counters for observability / metrics.
 */
export async function autoRefillCheck(): Promise<{
  checked: number;
  refillsRequested: number;
}> {
  const now = new Date();
  const sinceCutoff = new Date(now.getTime() - REFILL_WINDOW_MS);

  // ── Pull all completed orders within the refill window ──
  // We fetch a bounded batch (200) — if there are more, the next tick handles
  // them. We include `completedAt` in the select for the window check (already
  // enforced by the WHERE clause but kept for clarity in the response).
  const orders = await db.order.findMany({
    where: {
      status: "completed",
      completedAt: { gte: sinceCutoff },
    },
    take: 200,
    select: {
      id: true,
      publicId: true,
      userId: true,
      serviceName: true,
      platform: true,
      quantity: true,
      link: true,
      completedAt: true,
    },
  });

  let refillsRequested = 0;

  for (const order of orders) {
    try {
      // ── Skip if there's already an active refill ticket for this order ──
      // We check both the manual ([Refill]) and auto ([AutoRefill]) prefixes
      // so the auto-checker doesn't fire while a manual refill is in flight
      // (and vice versa).
      const existing = await db.ticket.findFirst({
        where: {
          OR: [
            { subject: { startsWith: `[Refill] ${order.publicId}` } },
            { subject: { startsWith: `[AutoRefill] ${order.publicId}` } },
          ],
          status: { in: ["open", "waiting"] },
        },
        select: { id: true },
      });
      if (existing) continue;

      // ── SIMULATE drop detection ──
      // In production: call provider API with order.id / providerOrderId,
      // compare current delivered count vs quantity. If dropped, treat as a
      // refill-eligible drop.
      const dropDetected = Math.random() < DROP_PROBABILITY;
      if (!dropDetected) continue;

      // ── Create a Ticket with the [AutoRefill] prefix ──
      const ticketPublicId = await nextPublicId("T", 201);
      const ticket = await db.ticket.create({
        data: {
          publicId: ticketPublicId,
          userId: order.userId,
          subject: `[AutoRefill] ${order.publicId} — ${order.serviceName}`,
          status: "open",
          priority: "medium",
          messages: {
            create: [{
              sender: "system",
              text:
                `Auto-detected drop in delivery. Refill requested automatically.\n\n` +
                `Order: ${order.publicId}\n` +
                `Service: ${order.serviceName}\n` +
                `Platform: ${order.platform}\n` +
                `Quantity: ${order.quantity}\n` +
                `Link: ${order.link ?? "N/A"}\n` +
                `Completed at: ${order.completedAt?.toISOString() ?? "N/A"}\n\n` +
                `The auto-refill worker detected that the delivered count has dropped below the originally completed amount. A refill has been queued automatically — no user action required.`,
            }],
          },
        },
      });

      // ── Enqueue a refill fulfillment job ──
      // The order.fulfill worker recognizes `isRefill: true` and re-runs the
      // delivery without re-charging the user (refills are free within the
      // 30-day window).
      enqueueJob("order.fulfill", {
        orderId: order.id,
        userId: order.userId,
        isRefill: true,
        refillTicketId: ticket.id,
      }).catch((e) =>
        console.error("[auto-refill] enqueue fulfill failed:", e),
      );

      // ── Notify the user that an auto-refill was triggered ──
      await createNotification({
        userId: order.userId,
        type: "order",
        title: `Auto-refill triggered for #${order.publicId}`,
        message: `We detected a drop in delivery and automatically queued a refill. No action required — ticket ${ticketPublicId} tracks progress.`,
        severity: "info",
      });

      refillsRequested++;
    } catch (e) {
      console.error(`[auto-refill] error processing ${order.id}:`, e);
      // Continue with the next order — one failure shouldn't abort the pass.
    }
  }

  return { checked: orders.length, refillsRequested };
}
