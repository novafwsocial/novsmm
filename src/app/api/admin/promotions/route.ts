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
    include: { service: { select: { name: true, platform: true } } },
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
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message ?? "Invalid", 422);

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

/** PATCH /api/admin/promotions — cancel a promotion */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, status } = body;
  if (!id) return apiError("ID required", 422);

  const promo = await db.promotion.update({ where: { id }, data: { status: status ?? "cancelled" } });
  await db.auditLog.create({
    data: { userId: adminId, action: "update", entity: "promotion", entityId: id, metadata: JSON.stringify({ status }) },
  });
  return apiOk({ promotion: promo });
}
