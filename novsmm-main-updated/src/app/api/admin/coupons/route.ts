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

/** GET /api/admin/coupons — paginated list.
 *
 * PERF FIX (P-H-004): added server-side pagination. Query params:
 * page (default 1), limit (default 50, max 200).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

  const [coupons, total] = await Promise.all([
    db.coupon.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.coupon.count(),
  ]);

  return apiOk({
    coupons,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
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

/** PATCH /api/admin/coupons — update one or more fields on a coupon.
 *
 * ADMIN-FIX-BATCH-1: previously only `status` was updatable. Now any of
 * { type, value, maxUses, expiresAt, status } can be patched (code is
 * immutable post-create — changing it would break already-distributed codes).
 *
 * Body: { id: string, ...fieldsToUpdate }
 */
const updateSchema = z.object({
  id: z.string(),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().nullable().optional(),
  status: z.enum(["active", "disabled", "expired"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { id, expiresAt, ...rest } = parsed.data;
  if (!id) return apiError("ID required", 422);

  // Normalize expiresAt: accept ISO string, null (clear), or omit.
  const data: Record<string, unknown> = { ...rest };
  if (expiresAt !== undefined) {
    data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  }

  try {
    const coupon = await db.coupon.update({ where: { id }, data });
    await audit(adminId, "update", "coupon", id, Object.keys(data));
    return apiOk({ coupon });
  } catch (e: any) {
    if (e.code === "P2025") return apiError("Coupon not found", 404);
    return apiError("Failed to update coupon", 500);
  }
}

/** DELETE /api/admin/coupons — hard-delete a coupon by id.
 *
 * ADMIN-FIX-BATCH-1: the admin UI exposes a "delete" affordance with a
 * confirmation dialog. The route lives on the same path (no [id] subroute),
 * so the coupon id is sent in the request body: `{ id }`.
 *
 * Soft-disable (PATCH status=disabled) is preferred for coupons that have
 * already been used — hard-delete loses audit history. Reserve DELETE for
 * coupons with usedCount === 0 or for cleanup.
 */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json().catch(() => ({}));
  const { id } = body ?? {};
  if (!id) return apiError("ID required", 422);

  try {
    const coupon = await db.coupon.delete({ where: { id } });
    await audit(adminId, "delete", "coupon", id, { code: coupon.code });
    return apiOk({ message: "Coupon deleted" });
  } catch (e: any) {
    if (e.code === "P2025") return apiError("Coupon not found", 404);
    return apiError("Failed to delete coupon", 500);
  }
}
