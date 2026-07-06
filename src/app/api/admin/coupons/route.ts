import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { z } from "zod";

const couponSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  maxUses: z.number().int().positive().default(100),
  expiresAt: z.string().optional(),
});

/** GET /api/admin/coupons */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return apiOk({ coupons });
}

/** POST /api/admin/coupons — create a coupon */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  try {
    const coupon = await db.coupon.create({
      data: {
        ...parsed.data,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });
    await audit(adminId, "create", "coupon", coupon.id, { code: coupon.code });
    return apiOk({ coupon, message: "Coupon created" }, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Coupon code already exists", 409);
    return apiError("Failed to create coupon", 500);
  }
}

/** PATCH /api/admin/coupons — disable/enable a coupon */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, status } = body;
  if (!id) return apiError("ID required", 422);

  const coupon = await db.coupon.update({ where: { id }, data: { status } });
  await audit(adminId, "update", "coupon", id, { status });
  return apiOk({ coupon });
}
