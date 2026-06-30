import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/services/[id] — full detail of a single service.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const service = await db.service.findUnique({
    where: { id: params.id },
    include: {
      provider: {
        select: { name: true, status: true, latency: true },
      },
    },
  });

  if (!service || service.status === "deleted") {
    return apiError("Service not found", 404);
  }

  // Get order stats for this service
  const orderCount = await db.order.count({
    where: { serviceId: service.id, status: "completed" },
  });

  return apiOk({
    service: {
      ...service,
      totalOrders: orderCount,
    },
  });
}
