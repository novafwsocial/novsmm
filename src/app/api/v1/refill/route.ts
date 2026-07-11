import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";

/**
 * POST /api/v1/refill
 * Public API for resellers — request a refill (re-delivery) for one or more
 * completed orders where the delivered count dropped.
 * Auth: Bearer nvsk_live_xxx (requires 'order' permission)
 *
 * Body (single):  { order: "A-10432" }
 * Body (multi):   { orders: ["A-10432", "A-10433"] }
 *
 * Refill rules:
 *   - Order must belong to the authenticated user
 *   - Order must be in "completed" state
 *   - Order must be within the refill window (default: 30 days after completion)
 *   - Only 1 active refill request per order at a time
 *
 * Response (single):
 *   { status, refill: "RF-XXXXX", order: "A-10432" }
 *
 * Response (multi):
 *   { status, refills: { "A-10432": "RF-XXXXX", "A-10433": "RF-XXXXX" } }
 *
 * Implementation note:
 *   Refills are tracked via the Ticket model (type "refill") with a reference
 *   to the original order. This avoids adding a new Prisma model while
 *   providing full audit trail. A background worker picks up refill requests
 *   and re-triggers fulfillment via the provider.
 */
const REFILL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function requestRefill(
  userId: string,
  orderPublicId: string,
  // Optional pre-fetched caches (used by multi-refill mode to avoid N+1):
  ordersByPid?: Map<string, any>,
  existingByPid?: Map<string, string>
): Promise<{ success: true; refillId: string } | { success: false; error: string }> {
  // Use cached order if available, otherwise fall back to a single query
  // (single-refill mode).
  let order: any;
  if (ordersByPid) {
    order = ordersByPid.get(orderPublicId);
  } else {
    order = await db.order.findUnique({
      where: { publicId: orderPublicId },
      select: {
        id: true, publicId: true, userId: true, status: true, completedAt: true,
        serviceName: true, platform: true, quantity: true, link: true, serviceId: true,
      },
    });
  }

  if (!order || order.userId !== userId) {
    return { success: false, error: "Order not found" };
  }

  if (order.status !== "completed") {
    return { success: false, error: "Only completed orders can be refilled" };
  }

  if (!order.completedAt) {
    return { success: false, error: "Order completion date missing" };
  }

  const elapsed = Date.now() - order.completedAt.getTime();
  if (elapsed > REFILL_WINDOW_MS) {
    return { success: false, error: "Refill window expired (30 days after completion)" };
  }

  // Check for existing pending refill on this order
  // Use cached result if available (multi-refill mode), otherwise query.
  if (existingByPid) {
    const existingRefillId = existingByPid.get(order.publicId);
    if (existingRefillId) {
      return { success: false, error: `Refill already requested (ticket ${existingRefillId})` };
    }
  } else {
    const existingRefill = await db.ticket.findFirst({
      where: {
        subject: { startsWith: `[Refill] ${order.publicId}` },
        status: { in: ["open", "waiting"] },
      },
      select: { publicId: true },
    });
    if (existingRefill) {
      return { success: false, error: `Refill already requested (ticket ${existingRefill.publicId})` };
    }
  }

  // Create a refill request as a ticket (type via subject prefix)
  const refillPublicId = await nextPublicId("T", 100);
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
          text: `Refill request for order ${order.publicId}.\n\nService: ${order.serviceName}\nPlatform: ${order.platform}\nQuantity: ${order.quantity}\nLink: ${order.link || "N/A"}\nCompleted at: ${order.completedAt.toISOString()}\n\nThe delivered count has dropped and a refill is requested.`,
        }],
      },
    },
    include: { messages: true },
  });

  // Notify admin + user
  await createNotification({
    userId,
    type: "order",
    title: `Refill requested for #${order.publicId}`,
    message: `Your refill request has been submitted (ticket ${refillPublicId}). Our team will process it shortly.`,
    severity: "info",
  });

  // Enqueue a refill job for the worker to pick up (re-trigger fulfillment)
  enqueueJob("order.fulfill", {
    orderId: order.id,
    userId,
    isRefill: true,
    refillTicketId: ticket.id,
  }).catch(() => {});

  return { success: true, refillId: refillPublicId };
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiKey(req, "order");
  if (error) return error;
  const userId = user.id;

  try {
    const body = await req.json();

    // Multi-refill mode
    if (body.orders && Array.isArray(body.orders)) {
      const orderIds: string[] = body.orders;
      if (orderIds.length === 0) {
        return apiError("No order IDs provided", 422);
      }
      if (orderIds.length > 100) {
        return apiError("Maximum 100 orders per request", 422);
      }

      // BATCHED PRE-FETCH (N+1 fix):
      // Instead of N findUnique + N findFirst calls inside the loop, we
      // fetch all candidate orders and all their existing pending refill
      // tickets in TWO queries, then reuse the results per iteration.
      // The per-order ticket.create + notification + enqueueJob remain
      // sequential because they have side effects and depend on
      // nextPublicId() (atomic sequence increment).

      // 1) Fetch all requested orders in one query (filtered by user)
      const orders = await db.order.findMany({
        where: {
          publicId: { in: orderIds },
          userId,
        },
        select: {
          id: true, publicId: true, userId: true, status: true, completedAt: true,
          serviceName: true, platform: true, quantity: true, link: true, serviceId: true,
        },
      });
      const ordersByPid = new Map(orders.map((o) => [o.publicId, o]));

      // 2) Fetch all existing pending refill tickets for these orders in one query
      //    Subject pattern: "[Refill] A-10432 — ..."
      const refillSubjects = orderIds.map((pid) => `[Refill] ${pid}`);
      const existingRefills = await db.ticket.findMany({
        where: {
          subject: { in: refillSubjects },
          status: { in: ["open", "waiting"] },
        },
        select: { subject: true, publicId: true },
      });
      // Map: orderPublicId → existing ticket publicId (first match wins)
      const existingByPid = new Map<string, string>();
      for (const t of existingRefills) {
        // subject looks like "[Refill] A-10432 — Service name"
        const m = t.subject.match(/^\[Refill\] (A-\d+)/);
        if (m && !existingByPid.has(m[1])) {
          existingByPid.set(m[1], t.publicId);
        }
      }

      const result: Record<string, any> = {};
      let allSuccess = true;
      for (const publicId of orderIds) {
        const r = await requestRefill(userId, publicId, ordersByPid, existingByPid);
        if (r.success) {
          result[publicId] = { refill: r.refillId };
        } else {
          result[publicId] = { error: r.error };
          allSuccess = false;
        }
      }

      return apiOk({
        status: allSuccess ? "success" : "partial",
        refills: result,
      });
    }

    // Single-refill mode
    const orderId = body.order || body.orderId;
    if (!orderId || typeof orderId !== "string") {
      return apiError("Provide 'order' (single) or 'orders' (array of IDs)", 422);
    }

    const r = await requestRefill(userId, orderId);
    if (!r.success) {
      return apiError(r.error, 422);
    }

    return apiOk({
      status: "success",
      refill: r.refillId,
      order: orderId,
    });
  } catch (e: any) {
    console.error("[v1/refill] error:", e);
    return apiError("Failed to request refill", 500);
  }
}
