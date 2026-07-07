import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/v1/status
 * Public API for resellers — query order status (single or multi).
 * Auth: Bearer nvsk_live_xxx (requires 'read' permission)
 *
 * Query params (PerfectPanel contract):
 *   Single:  ?order=A-10432
 *   Multi:   ?orders=A-10432,A-10433,A-10434
 *
 * Response (single):
 *   { status, order: "A-10432", service: "...", charge, start_count, status, remains, currency }
 *
 * Response (multi):
 *   { status, orders: { "A-10432": { charge, start_count, status, remains }, ... } }
 *
 * Status values (PerfectPanel convention):
 *   "Pending" | "In progress" | "Processing" | "Completed" | "Partial" | "Canceled" | "Refunded"
 */
function mapStatusToApi(status: string): string {
  switch (status) {
    case "pending":
    case "processing":
      return "Processing";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "partial":
      return "Partial";
    case "cancelled":
      return "Canceled";
    default:
      return status;
  }
}

function mapCharge(order: { totalPrice: number; currency: string }) {
  return {
    charge: Number(order.totalPrice.toFixed(4)),
    currency: order.currency || "USD",
  };
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiKey(req, "read");
  if (error) return error;
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const single = searchParams.get("order");
  const multi = searchParams.get("orders");

  // ── Single order status ──
  if (single) {
    const order = await db.order.findUnique({
      where: { publicId: single },
      select: {
        publicId: true, userId: true, serviceName: true, quantity: true,
        totalPrice: true, status: true, progress: true,
        createdAt: true, completedAt: true, link: true,
      },
    });

    // Don't leak other users' orders — return a 404-style response
    if (!order || order.userId !== userId) {
      return apiOk({
        status: "error",
        order: single,
        message: "Order not found or does not belong to this account",
      }, 200);
    }

    return apiOk({
      status: "success",
      order: order.publicId,
      service: order.serviceName,
      link: order.link || "",
      quantity: order.quantity,
      charge: Number(order.totalPrice.toFixed(4)),
      start_count: 0,
      orderStatus: mapStatusToApi(order.status),
      remains: order.quantity - Math.floor((order.progress / 100) * order.quantity),
      currency: user.currency || "USD",
    });
  }

  // ── Multi-order status ──
  if (multi) {
    const orderIds = multi.split(",").map((s) => s.trim()).filter(Boolean);
    if (orderIds.length === 0) {
      return apiError("No order IDs provided", 422);
    }
    if (orderIds.length > 100) {
      return apiError("Maximum 100 orders per request", 422);
    }

    const orders = await db.order.findMany({
      where: { publicId: { in: orderIds }, userId },
      select: {
        publicId: true, serviceName: true, quantity: true, totalPrice: true,
        status: true, progress: true, link: true,
      },
    });

    const orderMap = new Map(orders.map((o) => [o.publicId, o]));
    const result: Record<string, any> = {};
    for (const id of orderIds) {
      const order = orderMap.get(id);
      if (!order) {
        result[id] = { status: "error", error: "Order not found" };
      } else {
        result[id] = {
          charge: Number(order.totalPrice.toFixed(4)),
          start_count: 0,
          status: mapStatusToApi(order.status),
          remains: order.quantity - Math.floor((order.progress / 100) * order.quantity),
          currency: user.currency || "USD",
        };
      }
    }

    return apiOk({
      status: "success",
      orders: result,
    });
  }

  return apiError("Provide 'order' (single) or 'orders' (comma-separated multi) query parameter", 422);
}
