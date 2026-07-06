import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createPaymentMethodSchema, updatePaymentMethodSchema } from "@/lib/validations";
import { encryptJSON, decryptJSON, maskValue } from "@/lib/crypto-utils";

/** GET /api/admin/payment-methods */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const methods = await db.paymentMethod.findMany({
    orderBy: { sortOrder: "asc" },
  });
  // Don't expose full config (credentials) in the list — mask them.
  // m.config is now a Json column; maskConfig handles any JsonValue.
  const safe = methods.map((m) => ({
    ...m,
    config: m.config ? maskConfig(m.config) : null,
  }));
  return apiOk({ methods: safe });
}

/**
 * Mask sensitive config values for display (show only last 4 chars).
 *
 * `configStr` is the value read from the Json column. The only thing we
 * ever store there is an encrypted string produced by `encryptJSON()`,
 * which Prisma returns verbatim as a JS string. We accept `unknown` for
 * safety so the Json type flows through without per-call casts.
 */
function maskConfig(configStr: unknown): string {
  if (typeof configStr !== "string") return "••••";
  try {
    // Try decrypting first (new format)
    const config = decryptJSON(configStr);
    if (config) {
      const masked: Record<string, string> = {};
      for (const [key, value] of Object.entries(config)) {
        masked[key] = maskValue(String(value));
      }
      return JSON.stringify(masked);
    }
    // Fallback: try plain JSON (old format, not encrypted)
    const oldConfig = JSON.parse(configStr);
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(oldConfig)) {
      masked[key] = maskValue(String(value));
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
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  // Extract config fields (credentials) and encrypt before storing
  const { config, ...methodData } = body;
  const configStr = config ? encryptJSON(config) : null;

  try {
    const method = await db.paymentMethod.create({
      data: {
        ...methodData,
        ...(configStr ? { config: configStr } : {}),
      },
    });
    await audit(adminId, "create", "payment_method", method.id, { name: method.name, hasConfig: !!configStr });
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
  const parsed = updatePaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }
  const { id, config, ...data } = parsed.data;

  const updateData: any = { ...data };

  // If config is provided, encrypt before saving.
  // When clearing config (config=null), use Prisma.DbNull — a plain JS `null`
  // is not assignable to a Json column type at the Prisma client boundary.
  if (config !== undefined) {
    updateData.config = config ? encryptJSON(config) : Prisma.DbNull;
  }

  const method = await db.paymentMethod.update({ where: { id }, data: updateData });
  await audit(adminId, "update", "payment_method", id, { fields: Object.keys(updateData), hasConfig: !!config });
  return apiOk({ method: { ...method, config: method.config ? maskConfig(method.config) : null } });
}
