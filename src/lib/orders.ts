import { db } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import {
  placeHuntSMMOrder,
  extractProviderServiceId,
} from "@/lib/huntsmm";
// Phase 5: Import from the loyalty SERVICE module (not the API route).
// This eliminates the cross-route import anti-pattern.
import {
  awardOrderPoints,
  reconcileAchievements,
} from "@/lib/services/loyalty.service";

/**
 * Simulates provider fulfillment by updating order progress over time.
 *
 * Behavior:
 *  1. Fetches the order by ID. Bails out if it does not exist or was cancelled.
 *  2. If the order has a link AND its service name maps to a HuntSMM service,
 *     tries to place the order on HuntSMM (the real provider). On success the
 *     order is marked in_progress with the provider order ID and we return —
 *     status updates then flow through the webhook/cron.
 *  3. Otherwise (no link, or HuntSMM call failed), falls back to a simulated
 *     fulfillment with setTimeout steps:
 *        2s  → 15%   (in_progress)
 *        5s  → 40%   (in_progress)
 *        8s  → 75%   (in_progress)
 *        12s → 100%  (completed)
 *     Priority/highest plans run faster (0.7× / 0.4× speed multipliers).
 *  4. On the final (completed) step:
 *     - sends an `order` completion notification (with email)
 *     - awards loyalty points (1 pt / $1 × plan multiplier) and notifies
 *     - runs the achievement reconciler (fires its own notifications)
 *     - loyalty failures are swallowed (must never break fulfillment)
 *
 * Phase 3 will move the setTimeout loop into a BullMQ queue.
 */
export async function simulateFulfillment(
  orderId: string,
  userId: string,
): Promise<void> {
  // Fetch the full order to get the link and service name
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      publicId: true,
      serviceName: true,
      totalPrice: true,
      link: true,
      quantity: true,
      priority: true,
    },
  });
  if (!order || order.status === "cancelled") return;

  // Try to place the order on HuntSMM
  const providerServiceId = extractProviderServiceId(order.serviceName);
  if (providerServiceId && order.link) {
    const result = await placeHuntSMMOrder(
      providerServiceId,
      order.link,
      order.quantity,
    );

    if ("orderId" in result) {
      // Real order placed — update with provider order ID
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "in_progress",
          progress: 10,
          eta: "Processing on HuntSMM",
          providerName: `HuntSMM #${result.orderId}`,
        },
      });
      return; // Real fulfillment — status will be updated via webhook/cron
    } else {
      console.error("[fulfillment] HuntSMM order failed:", result.error);
      // Fall through to simulation
    }
  }

  // Fallback: simulate fulfillment (when no link, or provider fails).
  // Priority/highest plans get progressively faster step intervals to
  // mirror the queue-speed differentiation promised in the marketing copy.
  const speedMultiplier =
    order.priority === "highest"
      ? 0.4
      : order.priority === "priority"
        ? 0.7
        : 1.0; // standard

  const baseSteps = [
    { delay: 2000, progress: 15, status: "in_progress" },
    { delay: 5000, progress: 40, status: "in_progress" },
    { delay: 8000, progress: 75, status: "in_progress" },
    { delay: 12000, progress: 100, status: "completed" },
  ];
  const steps = baseSteps.map((s, i) => ({
    // Delay is the gap from the previous step; first step uses its own delay.
    delay: Math.round(
      (i === 0 ? s.delay : s.delay - baseSteps[i - 1].delay) * speedMultiplier,
    ),
    progress: s.progress,
    status: s.status,
  }));

  for (const step of steps) {
    await new Promise((r) => setTimeout(r, step.delay));

    const currentOrder = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        publicId: true,
        serviceName: true,
        totalPrice: true,
      },
    });
    if (!currentOrder || currentOrder.status === "cancelled") return;

    await db.order.update({
      where: { id: orderId },
      data: {
        progress: step.progress,
        status: step.status,
        eta:
          step.status === "completed"
            ? "—"
            : `${Math.ceil((100 - step.progress) / 20)}m`,
        completedAt: step.status === "completed" ? new Date() : null,
      },
    });

    if (step.status === "completed") {
      await createNotification({
        userId,
        type: "order",
        title: `Order #${currentOrder.publicId} completed ✅`,
        message: `${currentOrder.serviceName} — delivery complete.`,
        amount: currentOrder.totalPrice,
        severity: "success",
        sendEmail: true,
      });

      // ── Loyalty points + achievement reconciliation ──
      // Award 1 point per $1 spent × plan multiplier, then run the achievement
      // reconciler to unlock any newly-eligible milestones (first_order,
      // 10_orders, 100_orders, 100_spent, 1000_spent, big_spender, etc.).
      // Each unlocked achievement awards its bonus points as a separate
      // loyalty entry (handled inside reconcileAchievements).
      try {
        const userPlan = await db.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        if (userPlan) {
          const awarded = await awardOrderPoints(
            userId,
            currentOrder.id,
            currentOrder.totalPrice,
          );
          if (awarded.points > 0) {
            await createNotification({
              userId,
              type: "system",
              title: `+${awarded.points} loyalty points earned`,
              message: `Order #${currentOrder.publicId} — ${awarded.points} pts awarded (${awarded.multiplier}× loyalty multiplier).`,
              severity: "success",
              sendEmail: false,
            });
          }
          // Unlock any newly-eligible achievements. reconcileAchievements
          // fires its own notifications for each unlock, so nothing else to do.
          await reconcileAchievements(userId);
        }
      } catch (loyaltyErr) {
        // Loyalty failures must never break order fulfillment.
        console.error("[loyalty] award/reconcile failed:", loyaltyErr);
      }
    }
  }
}
