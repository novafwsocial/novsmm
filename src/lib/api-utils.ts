import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { db } from "./db";
import { Prisma } from "@prisma/client";

/**
 * Get the base URL of the current request, respecting proxy headers.
 * Uses x-forwarded-proto + x-forwarded-host when present (gateway/proxy),
 * otherwise falls back to the Host header. This replaces the need for
 * NEXTAUTH_URL env var and ensures redirects/links work behind any gateway.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Get the authenticated session.
 * In Next.js App Router, we need to manually forward headers/cookies
 * to getServerSession so it can read the session cookie.
 */
export async function getAuthSession() {
  return getServerSession(authOptions);
}

/** Require an authenticated user. Returns { session, error }. */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { session, error: null };
}

/** Require an admin user. Returns { session, user, error }. */
export async function requireAdmin() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, user: null, error };
  if ((session!.user as any).role !== "admin") {
    return {
      session: null,
      user: null,
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }
  return { session, user: null, error: null };
}

/** Standard error response. */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Standard success response. */
export function apiOk(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Audit log helper — captures IP + User-Agent from request headers.
 *
 * This replaces the previous pattern of `db.auditLog.create({ data: {...} })`
 * scattered across 34 routes, most of which never populated `ip` and none of
 * which captured `userAgent`. Now every audit entry has full forensic context.
 *
 * Usage:
 *   await audit(userId, "login", "user", userId);
 *   await audit(userId, "create", "order", order.id, { total: 42.50 });
 *   await audit(userId, "refund", "transaction", txn.id, { amount: 100 });
 */
export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const h = await headers();
    // Middleware forwards client IP via x-client-ip header.
    // Fall back to x-forwarded-for (standard proxy header) or "unknown".
    const ip =
      h.get("x-client-ip") ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const userAgent = h.get("user-agent") || "unknown";

    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ?? null,
        // metadata is now a Json column — Prisma serializes the object
        // automatically. Pass the object directly (no JSON.stringify).
        // When no metadata is supplied, use Prisma.DbNull to write SQL NULL
        // (a plain JS `null` is not assignable to a Json field type — Prisma
        // requires its DbNull/JsonNull sentinels to disambiguate SQL NULL
        // from a JSON `null` literal).
        metadata: metadata ?? Prisma.DbNull,
        ip,
        userAgent,
      },
    });
  } catch (e) {
    // Audit logging must NEVER break the main request flow.
    // Log to stderr for observability, but don't throw.
    console.error("[audit] Failed to write audit log:", e);
  }
}
