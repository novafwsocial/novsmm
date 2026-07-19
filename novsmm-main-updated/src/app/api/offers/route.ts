import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { z } from "zod";

const offerSchema = z.object({
  serviceId: z.string().min(1),
  price: z.number().positive(),
});

/**
 * GET /api/offers — list the current user's offers (published services for resale).
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const offers = await db.offer.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch related services separately (Offer has no relation in schema)
  const serviceIds = [...new Set(offers.map((o) => o.serviceId))];
  const services = await db.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true, platform: true, cost: true, price: true, quality: true, deliveryTime: true },
  });
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const offersWithService = offers.map((o) => ({
    ...o,
    service: serviceMap.get(o.serviceId) ?? null,
  }));

  // Calculate totals
  const totalEarnings = offersWithService.reduce((s, o) => s + o.earnings, 0);
  const totalSales = offersWithService.reduce((s, o) => s + o.sales, 0);

  return apiOk({ offers: offersWithService, totalEarnings, totalSales });
}

/**
 * POST /api/offers — publish a new offer (resell a service at custom price).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { serviceId, price } = parsed.data;

  // Get the service to calculate margin
  const service = await db.service.findUnique({
    where: { id: serviceId },
  });
  if (!service) return apiError("Service not found", 404);
  if (service.status !== "active") return apiError("Service not available", 422);

  // Check if user already has an offer for this service
  const existing = await db.offer.findFirst({
    where: { userId, serviceId },
  });
  if (existing) return apiError("You already have an offer for this service", 409);

  // Calculate margin
  const cost = service.cost;
  const margin = ((price - cost) / price) * 100;

  const offer = await db.offer.create({
    data: {
      userId,
      serviceId,
      price,
      cost,
      margin,
      status: "active",
    },
  });

  return apiOk({ offer: { ...offer, service }, message: "Offer published" }, 201);
}

/**
 * PATCH /api/offers — update offer price or pause/activate.
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { id, price, status } = body;
  if (!id) return apiError("Offer ID is required", 422);

  const offer = await db.offer.findUnique({ where: { id } });
  if (!offer || offer.userId !== userId) {
    return apiError("Offer not found", 404);
  }

  const updateData: any = {};
  if (price !== undefined) {
    updateData.price = price;
    updateData.margin = ((price - offer.cost) / price) * 100;
  }
  if (status) updateData.status = status;

  const updated = await db.offer.update({ where: { id }, data: updateData });
  return apiOk({ offer: updated });
}

/**
 * DELETE /api/offers — remove an offer.
 */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("Offer ID is required", 422);

  const offer = await db.offer.findUnique({ where: { id } });
  if (!offer || offer.userId !== userId) {
    return apiError("Offer not found", 404);
  }

  await db.offer.delete({ where: { id } });
  return apiOk({ message: "Offer removed" });
}
