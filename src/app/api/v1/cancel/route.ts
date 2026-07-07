import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";

/**
 * POST /api/v1/cancel
 * Public API for resellers — cancel one or more orders (with full refund).
 * Auth: Bearer nvsk_live_xxx (requires 'order' permission)
 *
 * Body (single):   { order: "A-10432" }
 * Body (multi):    { orders: ["A-10432", "A-10433"] }
 *
 * Cancellation rules (same as internal API):
 *   - Order must belong to the authenticated user
 *   - Order must be in pending/processing state (not yet in_progress/completed)
 *   - Within 60 seconds of placement (CANCEL_WINDOW_MS)
 *
 * Response (single):
 *   { status, order: "A-10432", refunded: 2.50, currency }
 *
 * Response (multi):
 *   { status, orders: { "A-10432": { refunded: 2.50 }, ... } }
 */
const CANCEL_WINDOW_MS = 60 * 1000; // 60 seconds — matches internal API

async function cancelSingleOrder(
  userId: string,
  publicId: string
): Promise<{ success: true; refunded: number } | { success: false; error: string }> {
  const order = await db.order.findUnique({
    where: { publicId },
    select: {
      id: true, publicId: true, userId: true, status: true,
      totalPrice: true, createdAt: true, serviceName: true,
    },
  });

  if (!order || order.userId !== userId) {
    return { success: false, error: "Order not found" };
  }

  if (order.status !== "pending" && order.status !== "processing") {
    return { success: false, error: "Order cannot be cancelled (already in progress or completed)" };
  }

  const elapsed = Date.now() - order.createdAt.getTime();
  if (elapsed > CANCEL_WINDOW_MS) {
    return { success: false, error: "Cancel window expired (60 seconds after placement)" };
  }

  const txPublicId = await nextPublicId("TX", 8842);
  await db.$transaction([
    db.order.update({
      where: { id: order.id },
      data: {
        status: "cancelled",
        progress: 0,
        eta: "Cancelled",
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { balance: { increment: order.totalPrice } },
    }),
    db.transaction.create({
      data: {
        publicId: txPublicId,
        userId,
        type: "sale",
        amount: order.totalPrice,
        description: `API Refund — cancelled order #${order.publicId} — ${order.serviceName}`,
        method: "balance",
        reference: `refund:${order.publicId}`,
        orderId: order.id,
      },
    }),
  ]);

  await createNotification({
    userId,
    type: "order",
    title: `Order #${order.publicId} cancelled (via API)`,
    message: `Refunded $${order.totalPrice.toFixed(2)} to your balance.`,
    amount: order.totalPrice,
    severity: "info",
  });

  return { success: true, refunded: order.totalPrice };
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiKey(req, "order");
  if (error) return error;
  const userId = user.id;

  try {
    const body = await req.json();

    // Multi-cancel mode
    if (body.orders && Array.isArray(body.orders)) {
      const orderIds: string[] = body.orders;
      if (orderIds.length === 0) {
        return apiError("No order IDs provided", 422);
      }
      if (orderIds.length > 100) {
        return apiError("Maximum 100 orders per request", 422);
      }

      const result: Record<string, any> = {};
      let allSuccess = true;
      for (const publicId of orderIds) {
        const r = await cancelSingleOrder(userId, publicId);
        if (r.success) {
          result[publicId] = { refunded: Number(r.refunded.toFixed(4)) };
        } else {
          result[publicId] = { error: r.error };
          allSuccess = false;
        }
      }

      return apiOk({
        status: allSuccess ? "success" : "partial",
        orders: result,
      });
    }

    // Single-cancel mode
    const orderId = body.order || body.orderId;
    if (!orderId || typeof orderId !== "string") {
      return apiError("Provide 'order' (single) or 'orders' (array of IDs)", 422);
    }

    const r = await cancelSingleOrder(userId, orderId);
    if (!r.success) {
      return apiError(r.error, 422);
    }

    return apiOk({
      status: "success",
      order: orderId,
      refunded: Number(r.refunded.toFixed(4)),
      currency: user.currency || "USD",
    });
  } catch (e: any) {
    console.error("[v1/cancel] error:", e);
    return apiError("Failed to cancel order", 500);
  }
}
