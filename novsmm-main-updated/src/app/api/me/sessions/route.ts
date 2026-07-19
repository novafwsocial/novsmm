import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";

/**
 * GET /api/me/sessions — list active sessions for the current user.
 * Returns session info (device, IP, last active) from the Session table
 * + recent audit log entries (logins).
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  // Get DB sessions (JWT strategy doesn't use these, but adapter creates them on OAuth login)
  const dbSessions = await db.session.findMany({
    where: { userId },
    orderBy: { expires: "desc" },
    select: {
      id: true,
      sessionToken: true,
      expires: true,
    },
  });

  // Get recent login audit logs as "session" records
  const recentLogins = await db.auditLog.findMany({
    where: {
      userId,
      action: "login",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      ip: true,
      createdAt: true,
      metadata: true,
    },
  });

  // Format sessions with device info
  // metadata is now a Json column — Prisma returns the parsed object directly.
  const sessions = recentLogins.map((log, i) => {
    let deviceInfo = "Unknown device";
    try {
      if (log.metadata) {
        const meta = log.metadata as Record<string, any> | null;
        if (meta?.userAgent) deviceInfo = meta.userAgent;
      }
    } catch {}
    return {
      id: log.id,
      ip: log.ip ?? "unknown",
      device: deviceInfo,
      location: "Unknown",
      lastActive: log.createdAt,
      current: i === 0, // most recent is current
    };
  });

  return apiOk({
    sessions,
    dbSessionCount: dbSessions.length,
  });
}

/**
 * DELETE /api/me/sessions — revoke all sessions (sign out everywhere).
 *
 * Z-3 FIX: Previously only deleted DB Session rows (which JWT strategy
 * doesn't use). The JWT cookie remained valid until 24h expiry — the
 * "All other sessions revoked" message was misleading. Now bumps
 * passwordChangedAt, which the jwt callback checks on every request to
 * invalidate ALL existing JWTs (including the current one). The user
 * will need to sign in again after this.
 */
export async function DELETE() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  // Delete all DB sessions for this user (OAuth adapter sessions)
  await db.session.deleteMany({
    where: { userId },
  });

  // Z-3 FIX: Bump passwordChangedAt to invalidate ALL existing JWTs.
  // The jwt callback checks `token.iat < passwordChangedAt` on every
  // request and returns {} (logged out) if the token was issued before
  // the bump. This forces all sessions (including the current one) to
  // re-authenticate. This is the same pattern used by /api/me/password
  // and /api/me/2fa/disable.
  await db.user.update({
    where: { id: userId },
    data: { passwordChangedAt: new Date() },
  });

  // Invalidate the user cache so the jwt callback picks up the new
  // passwordChangedAt immediately (no 30s stale window).
  try {
    const { cacheInvalidate } = await import("@/lib/cache");
    await cacheInvalidate(`user:${userId}`);
  } catch {
    // best-effort
  }

  // Audit log
  await audit(userId, "revoke_sessions", "session", userId);

  return apiOk({ message: "All sessions revoked. Please sign in again." });
}
