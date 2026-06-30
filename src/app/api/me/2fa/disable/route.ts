import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { verify2FAToken } from "@/lib/two-factor";

/**
 * POST /api/me/2fa/disable
 * Disables 2FA after verifying the current token.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { token } = body;

  if (!token) {
    return apiError("Verification token is required to disable 2FA", 422);
  }

  // Get the active 2FA setup
  const active = await db.setting.findUnique({
    where: { key: `2fa:${userId}` },
  });

  if (!active) {
    return apiError("2FA is not enabled", 400);
  }

  const { secret } = JSON.parse(active.value);

  // Verify the token before disabling
  if (!verify2FAToken(token, secret)) {
    return apiError("Invalid verification code.", 400);
  }

  // Delete the 2FA setup
  await db.setting.delete({
    where: { key: `2fa:${userId}` },
  });

  // Also delete any pending setup
  await db.setting.deleteMany({
    where: { key: `2fa:pending:${userId}` },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      userId,
      action: "disable_2fa",
      entity: "user",
      entityId: userId,
    },
  });

  return apiOk({ message: "2FA disabled successfully." });
}
