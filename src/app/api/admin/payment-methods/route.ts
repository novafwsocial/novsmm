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
  // Don't expose full config (credentials) in the list — mask them
  const safe = methods.map((m) => ({
    ...m,
    config: m.config ? maskConfig(m.config) : null,
  }));
  return apiOk({ methods: safe });
}

/** Mask sensitive config values for display (show only last 4 chars) */
function maskConfig(configStr: string): string {
  try {
    const config = JSON.parse(configStr);
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      const str = String(value);
      if (str.length > 8) {
        masked[key] = "••••••••" + str.slice(-4);
      } else {
        masked[key] = "••••";
      }
    }
    return JSON.stringify(masked);
  } catch {
    return "••••";
  }
}

/** POST /api/admin/payment-methods — add a new payment method with config. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = createPaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid input", 422);
  }

  // Extract config fields (credentials)
  const { config, ...methodData } = body;
  const configStr = config ? JSON.stringify(config) : null;

  try {
    const method = await db.paymentMethod.create({
      data: {
        ...methodData,
        ...(configStr ? { config: configStr } : {}),
      },
    });
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "create",
        entity: "payment_method",
        entityId: method.id,
        metadata: JSON.stringify({ name: method.name, hasConfig: !!configStr }),
      },
    });
    return apiOk({ method: { ...method, config: configStr ? maskConfig(configStr) : null }, message: "Payment method added" }, 201);
  } catch (e: any) {
    if (e.code === "P2002")
      return apiError("Payment method name already exists", 409);
    throw e;
  }
}

/** PATCH /api/admin/payment-methods — update method + save credentials. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, config, ...data } = body;
  if (!id) return apiError("ID required", 422);

  const updateData: any = { ...data };

  // If config is provided, save it as JSON
  if (config !== undefined) {
    updateData.config = config ? JSON.stringify(config) : null;
  }

  const method = await db.paymentMethod.update({ where: { id }, data: updateData });
  await db.auditLog.create({
    data: {
      userId: adminId,
      action: "update",
      entity: "payment_method",
      entityId: id,
      metadata: JSON.stringify({ fields: Object.keys(updateData), hasConfig: !!config }),
    },
  });
  return apiOk({ method: { ...method, config: method.config ? maskConfig(method.config) : null } });
}
