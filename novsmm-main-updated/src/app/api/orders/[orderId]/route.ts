import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/orders/:orderId
 *
 * Returns a single authenticated user's order by either internal id or
 * publicId. This powers the order detail drawer and URL deep links.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const { orderId } = await params;

  if (!orderId) {
    return apiError("orderId is required", 422);
  }

  const order = await db.order.findFirst({
    where: {
      userId,
      OR: [{ id: orderId }, { publicId: orderId }],
    },
    select: {
      id: true,
      publicId: true,
      serviceId: true,
      serviceName: true,
      platform: true,
      quantity: true,
      unitCost: true,
      unitPrice: true,
      totalCost: true,
      totalPrice: true,
      profit: true,
      status: true,
      progress: true,
      priority: true,
      providerId: true,
      providerName: true,
      link: true,
      eta: true,
      flag: true,
      dripFeedConfig: true,
      createdAt: true,
      updatedAt: true,
      completedAt: true,
    },
  });

  if (!order) {
    return apiError("Order not found", 404);
  }

  return apiOk({ order });
}
