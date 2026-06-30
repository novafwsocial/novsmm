import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { createPaymentMethodSchema } from "@/lib/validations";

/** GET /api/admin/payment-methods */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const methods = await db.paymentMethod.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return apiOk({ methods });
}

/** POST /api/admin/payment-methods — add a new payment method. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = createPaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid input", 422);
  }

  try {
    const method = await db.paymentMethod.create({ data: parsed.data });
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "create",
        entity: "payment_method",
        entityId: method.id,
      },
    });
    return apiOk({ method, message: "Payment method added" }, 201);
  } catch (e: any) {
    if (e.code === "P2002")
      return apiError("Payment method name already exists", 409);
    throw e;
  }
}

/** PATCH /api/admin/payment-methods */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return apiError("ID required", 422);

  const method = await db.paymentMethod.update({ where: { id }, data });
  await db.auditLog.create({
    data: { userId: adminId, action: "update", entity: "payment_method", entityId: id },
  });
  return apiOk({ method });
}
