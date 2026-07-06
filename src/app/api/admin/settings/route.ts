import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";

/** GET /api/admin/settings — all platform settings. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const settings = await db.setting.findMany({ orderBy: { key: "asc" } });
  const map: Record<string, string> = {};
  settings.forEach((s) => (map[s.key] = s.value));
  return apiOk({ settings: map });
}

/** PATCH /api/admin/settings — update one or more settings. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  // body is { key: value, key2: value2, ... }
  const updates = Object.entries(body);
  if (updates.length === 0) return apiError("No settings to update", 422);

  for (const [key, value] of updates) {
    await db.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  await audit(adminId, "update", "settings", null, body);

  return apiOk({ message: `${updates.length} settings updated` });
}
