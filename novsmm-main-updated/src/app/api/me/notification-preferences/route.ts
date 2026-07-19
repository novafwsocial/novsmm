import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk, apiError } from "@/lib/api-utils";
import { z } from "zod";

/**
 * GET /api/me/notification-preferences
 * Returns the user's notification preferences (which types they want to receive).
 * Stored as a Setting with key `notif_prefs:{userId}`.
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const setting = await db.setting.findUnique({
    where: { key: `notif_prefs:${userId}` },
  });

  const defaults = {
    orders: true,
    sales: true,
    tickets: true,
    recharges: true,
    withdrawals: true,
    referrals: true,
    system: true,
    marketplace: true,
    emailOrders: true,
    emailTickets: true,
    emailMarketing: false,
  };

  let prefs = defaults;
  if (setting) {
    try { prefs = { ...defaults, ...JSON.parse(setting.value) }; } catch {}
  }

  return apiOk({ preferences: prefs });
}

/**
 * I-3 FIX: Strict Zod schema for notification preferences.
 * Previously the PATCH handler did `{ ...current, ...body }` with no
 * validation — any key (including __proto__) was accepted and persisted.
 * While not exploitable as prototype pollution (shallow spread), it was
 * inconsistent with the rest of the codebase (all other mutating
 * endpoints use .strict() Zod). Now only the 11 known preference keys
 * are accepted, each as an optional boolean.
 */
const notifPrefsSchema = z
  .object({
    orders: z.boolean().optional(),
    sales: z.boolean().optional(),
    tickets: z.boolean().optional(),
    recharges: z.boolean().optional(),
    withdrawals: z.boolean().optional(),
    referrals: z.boolean().optional(),
    system: z.boolean().optional(),
    marketplace: z.boolean().optional(),
    emailOrders: z.boolean().optional(),
    emailTickets: z.boolean().optional(),
    emailMarketing: z.boolean().optional(),
  })
  .strict(); // reject unknown keys

/**
 * PATCH /api/me/notification-preferences
 * Updates the user's notification preferences.
 * Body: { orders: true, sales: false, ... } (only known keys, all booleans)
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  let body;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 422);
  }

  // I-3 FIX: Validate with strict Zod schema — rejects unknown keys
  const parsed = notifPrefsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues[0]?.message ?? "Invalid notification preferences",
      422
    );
  }

  const existing = await db.setting.findUnique({
    where: { key: `notif_prefs:${userId}` },
  });
  let current: Record<string, boolean> = {};
  if (existing) {
    try { current = JSON.parse(existing.value); } catch {}
  }

  // Merge — only the validated keys from parsed.data are spread
  const updated = { ...current, ...parsed.data };

  await db.setting.upsert({
    where: { key: `notif_prefs:${userId}` },
    update: { value: JSON.stringify(updated) },
    create: { key: `notif_prefs:${userId}`, value: JSON.stringify(updated) },
  });

  return apiOk({ preferences: updated, message: "Notification preferences updated" });
}
