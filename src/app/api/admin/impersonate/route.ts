import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";

/**
 * POST /api/admin/impersonate — pre-flight check before the frontend
 * triggers `signIn("impersonate", { adminEmail, adminPassword, targetUserId })`.
 *
 * This route is OPTIONAL — the actual impersonation flow is handled by the
 * "impersonate" NextAuth credentials provider (see src/lib/auth.ts). The
 * provider is what mints the new session JWT. This route exists so the
 * frontend can:
 *   1. Validate the target user (exists, active, not an admin) before
 *      prompting the admin for their password.
 *   2. Pre-write an audit log entry marking the intent to impersonate.
 *
 * The actual `audit(adminId, "impersonate", ...)` is also written inside
 * the provider when the impersonation succeeds — so this route's audit
 * entry uses action "impersonate_attempt" to distinguish a pre-flight
 * attempt from a successful impersonation.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;
  const adminEmail = (session!.user as any).email;

  const body = await req.json().catch(() => ({}));
  const { userId } = body;

  if (!userId) {
    return apiError("userId is required", 422);
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      status: true,
      country: true,
      currency: true,
      createdAt: true,
    },
  });

  if (!target) {
    return apiError("Target user not found", 404);
  }
  if (target.status !== "active") {
    return apiError(`Target user is ${target.status}, cannot impersonate`, 422);
  }
  if (target.role === "admin") {
    return apiError("Cannot impersonate another admin (safety)", 422);
  }

  // Pre-flight audit log (intent). The provider writes the real "impersonate"
  // entry on successful auth.
  await audit(adminId, "impersonate_attempt", "user", target.id, {
    targetEmail: target.email,
    targetName: target.name,
  });

  // Return the admin's email so the frontend can pass it to signIn("impersonate", ...).
  return apiOk({
    ok: true,
    adminEmail,
    target: {
      id: target.id,
      email: target.email,
      name: target.name,
      username: target.username,
      role: target.role,
    },
  });
}
