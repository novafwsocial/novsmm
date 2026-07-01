import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { z } from "zod";

const promoSchema = z.object({
  name: z.string().min(2),
  description: z.string().default(""),
  serviceId: z.string().optional(),
  discount: z.number().min(0).max(100),
  startsAt: z.string(),
  endsAt: z.string(),
});

/** GET /api/admin/promotions */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const promotions = await db.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });
  // Auto-update status based on dates
  const now = new Date();
  const updated = promotions.map((p) => {
    let status = p.status;
    if (p.status === "scheduled" && p.startsAt <= now && p.endsAt > now) status = "active";
    if ((p.status === "active" || p.status === "scheduled") && p.endsAt <= now) status = "ended";
    return { ...p, status };
  });
  return apiOk({ promotions: updated });
}

/** POST /api/admin/promotions */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = promoSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid", 422);

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (endsAt <= startsAt) return apiError("End date must be after start date", 422);

  const now = new Date();
  const status = startsAt <= now && endsAt > now ? "active" : "scheduled";

  const promo = await db.promotion.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      serviceId: parsed.data.serviceId || null,
      discount: parsed.data.discount,
      startsAt,
      endsAt,
      status,
    },
  });
  await db.auditLog.create({
    data: { userId: adminId, action: "create", entity: "promotion", entityId: promo.id, metadata: JSON.stringify({ name: promo.name, discount: promo.discount }) },
  });
  return apiOk({ promotion: promo, message: "Promotion created" }, 201);
}

/** PATCH /api/admin/promotions — update fields of a promotion (name, description, discount, startsAt, endsAt, status). */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, name, description, discount, startsAt, endsAt, status } = body;
  if (!id) return apiError("ID required", 422);

  // Build the update payload from provided fields
  const update: Record<string, any> = {};
  if (typeof name === "string" && name.trim().length >= 2) update.name = name.trim();
  if (typeof description === "string") update.description = description;
  if (discount !== undefined && typeof discount === "number" && discount >= 0 && discount <= 100) {
    update.discount = discount;
  }
  if (startsAt) {
    const d = new Date(startsAt);
    if (!isNaN(d.getTime())) update.startsAt = d;
  }
  if (endsAt) {
    const d = new Date(endsAt);
    if (!isNaN(d.getTime())) update.endsAt = d;
  }
  if (typeof status === "string") {
    update.status = status;
  }

  // Validate date range if both provided
  const finalStart = update.startsAt ?? (await db.promotion.findUnique({ where: { id }, select: { startsAt: true } }))?.startsAt;
  const finalEnd = update.endsAt ?? (await db.promotion.findUnique({ where: { id }, select: { endsAt: true } }))?.endsAt;
  if (finalStart && finalEnd && finalEnd <= finalStart) {
    return apiError("End date must be after start date", 422);
  }

  if (Object.keys(update).length === 0) {
    return apiError("No valid fields to update", 422);
  }

  const promo = await db.promotion.update({ where: { id }, data: update });
  await db.auditLog.create({
    data: {
      userId: adminId,
      action: "update",
      entity: "promotion",
      entityId: id,
      metadata: JSON.stringify(update),
    },
  });
  return apiOk({ promotion: promo });
}
