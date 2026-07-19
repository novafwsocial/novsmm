import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiOk, apiError, audit } from "@/lib/api-utils";

/**
 * GET /api/admin/version — get the current version announcement.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const setting = await db.setting.findUnique({
    where: { key: "platform.version" },
  });

  if (!setting) {
    return apiOk({ version: null, notes: null, publishedAt: null });
  }

  try {
    const data = JSON.parse(setting.value);
    return apiOk(data);
  } catch {
    return apiOk({ version: setting.value, notes: null, publishedAt: null });
  }
}

/**
 * POST /api/admin/version — publish a new version announcement.
 * Body: { version: "1.2.0", notes: "What's new..." }
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { version, notes } = body;

  if (!version) {
    return apiError("Version is required", 422);
  }

  const value = JSON.stringify({
    version,
    notes: notes || "",
    publishedAt: new Date().toISOString(),
  });

  await db.setting.upsert({
    where: { key: "platform.version" },
    update: { value },
    create: { key: "platform.version", value },
  });

  await audit(user!.id, "update", "setting", "platform.version", { version });

  return apiOk({ version, notes: notes || "", publishedAt: new Date().toISOString() });
}

/**
 * DELETE /api/admin/version — remove the current version announcement.
 */
export async function DELETE() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  await db.setting.deleteMany({
    where: { key: "platform.version" },
  });

  await audit(user!.id, "delete", "setting", "platform.version");

  return apiOk({ success: true });
}
