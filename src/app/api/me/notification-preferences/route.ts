import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk } from "@/lib/api-utils";

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
 * PATCH /api/me/notification-preferences
 * Updates the user's notification preferences.
 * Body: { orders: true, sales: false, ... }
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();

  const existing = await db.setting.findUnique({
    where: { key: `notif_prefs:${userId}` },
  });
  let current = {};
  if (existing) {
    try { current = JSON.parse(existing.value); } catch {}
  }

  const updated = { ...current, ...body };

  await db.setting.upsert({
    where: { key: `notif_prefs:${userId}` },
    update: { value: JSON.stringify(updated) },
    create: { key: `notif_prefs:${userId}`, value: JSON.stringify(updated) },
  });

  return apiOk({ preferences: updated, message: "Notification preferences updated" });
}
