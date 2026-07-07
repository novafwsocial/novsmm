import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";

/**
 * POST /api/admin/impersonate/stop — return to the admin account.
 *
 * Validates the current session is an impersonation session (session.user.realAdminId
 * is set), then mints a fresh JWT for the real admin and overwrites the session
 * cookie. The frontend reloads the page after a successful call.
 *
 * SECURITY: The real admin's identity is preserved only inside the JWT
 * (signed with NEXTAUTH_SECRET). An attacker can't forge this without the
 * secret — so only a genuine impersonation session can call this endpoint
 * and get back an admin session.
 */
export async function POST(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = session!.user as any;
  if (!user.realAdminId) {
    return apiError("Current session is not an impersonation session", 400);
  }

  const adminId = user.realAdminId as string;
  const currentUserId = user.id as string;

  // Validate the real admin still exists and is active
  const admin = await db.user.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      status: true,
    },
  });
  if (!admin || admin.status !== "active") {
    return apiError("Original admin account is no longer available", 422);
  }

  // Audit log (stop)
  await audit(adminId, "impersonate_stop", "user", currentUserId, {
    targetUserId: currentUserId,
  });

  // Mint a fresh JWT for the real admin
  const secret = process.env.NEXTAUTH_SECRET || "dev-secret-fallback";
  const newToken = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    username: admin.username,
    // No realAdminId — this is a normal admin session again
  };

  const encoded = await encode({
    token: newToken,
    secret,
    maxAge: 30 * 24 * 60 * 60, // 30 days, matching NextAuth default
  });

  // Determine cookie name (NextAuth uses __Secure- prefix in production HTTPS)
  const cookieName =
    process.env.NODE_ENV === "production" && process.env.NEXTAUTH_URL?.startsWith("https")
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  const cookieStore = await cookies();
  cookieStore.set({
    name: cookieName,
    value: encoded,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    // secure: true only in HTTPS production
    ...(process.env.NODE_ENV === "production" &&
    process.env.NEXTAUTH_URL?.startsWith("https")
      ? { secure: true }
      : {}),
  });

  return apiOk({
    ok: true,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  });
}
