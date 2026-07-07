import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";

/**
 * POST /api/orders/refill — internal refill endpoint for the dashboard.
 *
 * The v1 API has /api/v1/refill (for API keys, used by resellers / bots), but
 * the dashboard uses session auth. This endpoint provides the same refill
 * logic but authenticates via the NextAuth session.
 *
 * Body: { orderId: string }   ← internal cuid (NOT the publicId)
 *
 * Refill rules (same as /api/v1/refill):
 *   - Order must belong to the authenticated user
 *   - Order must be in "completed" state
 *   - Order must be within the refill window (default: 30 days after completion)
 *   - Only 1 active refill request per order at a time
 *
 * Response: { success, refillId }
 *
 * Implementation: creates a Ticket with subject `[Refill] {orderPublicId}` and
 * enqueues an `order.fulfill` job with the `isRefill` flag. The ticket tracks
 * the refill conversation (admin replies, status updates); the job re-runs
 * fulfillment via the normal pipeline.
 */
const REFILL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  try {
    const body = await req.json();
    const { orderId } = body;
    if (!orderId || typeof orderId !== "string") {
      return apiError("orderId is required", 422);
    }

    // ── Fetch order ──
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        publicId: true,
        userId: true,
        status: true,
        completedAt: true,
        serviceName: true,
        platform: true,
        quantity: true,
        link: true,
      },
    });
    if (!order || order.userId !== userId) {
      return apiError("Order not found", 404);
    }

    if (order.status !== "completed") {
      return apiError("Only completed orders can be refilled", 422);
    }
    if (!order.completedAt) {
      return apiError("Order completion date missing", 422);
    }
    const elapsed = Date.now() - order.completedAt.getTime();
    if (elapsed > REFILL_WINDOW_MS) {
      return apiError("Refill window expired (30 days after completion)", 422);
    }

    // ── Check for an existing pending refill on this order ──
    // Match both [Refill] (manual) and [AutoRefill] (auto-worker) prefixes so
    // a manual request doesn't fire while an auto-refill is in flight.
    const existing = await db.ticket.findFirst({
      where: {
        OR: [
          { subject: { startsWith: `[Refill] ${order.publicId}` } },
          { subject: { startsWith: `[AutoRefill] ${order.publicId}` } },
        ],
        status: { in: ["open", "waiting"] },
      },
      select: { publicId: true },
    });
    if (existing) {
      return apiError(`Refill already requested (ticket ${existing.publicId})`, 422);
    }

    // ── Create the refill ticket ──
    const refillPublicId = await nextPublicId("T", 201);
    const ticket = await db.ticket.create({
      data: {
        publicId: refillPublicId,
        userId,
        subject: `[Refill] ${order.publicId} — ${order.serviceName}`,
        status: "open",
        priority: "medium",
        messages: {
          create: [{
            sender: "user",
            text:
              `Refill request for order ${order.publicId}.\n\n` +
              `Service: ${order.serviceName}\n` +
              `Platform: ${order.platform}\n` +
              `Quantity: ${order.quantity}\n` +
              `Link: ${order.link ?? "N/A"}\n` +
              `Completed at: ${order.completedAt.toISOString()}\n\n` +
              `The delivered count has dropped below the originally completed amount and a refill is requested.`,
          }],
        },
      },
    });

    // ── Notify + enqueue refill fulfillment ──
    await createNotification({
      userId,
      type: "order",
      title: `Refill requested for #${order.publicId}`,
      message: `Your refill request has been submitted (ticket ${refillPublicId}). Our team will process it shortly.`,
      severity: "info",
    });

    enqueueJob("order.fulfill", {
      orderId: order.id,
      userId,
      isRefill: true,
      refillTicketId: ticket.id,
    }).catch(() => {});

    return apiOk({
      success: true,
      refillId: refillPublicId,
    });
  } catch (e: any) {
    console.error("[orders/refill] error:", e);
    return apiError("Failed to request refill", 500);
  }
}
