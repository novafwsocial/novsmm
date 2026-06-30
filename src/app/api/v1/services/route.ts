import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiOk } from "@/lib/api-utils";

/**
 * GET /api/v1/services
 * Public API for resellers — returns the active service catalog.
 * Auth: Bearer nvsk_live_xxx (requires 'read' permission)
 *
 * Response format matches common SMM panel API conventions.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiKey(req, "read");
  if (error) return error;

  const services = await db.service.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      platform: true,
      category: true,
      description: true,
      quality: true,
      deliveryTime: true,
      price: true,
      minQty: true,
      maxQty: true,
      rate: true,
    },
    orderBy: [{ platform: "asc" }, { price: "asc" }],
  });

  // Format for API consumers
  return apiOk({
    status: "success",
    services: services.map((s) => ({
      service: s.id,
      name: s.name,
      platform: s.platform,
      category: s.category,
      description: s.description,
      quality: s.quality,
      delivery_time: s.deliveryTime,
      rate: s.price, // price per 1000
      min: s.minQty,
      max: s.maxQty,
      speed: s.rate,
    })),
    count: services.length,
  });
}
