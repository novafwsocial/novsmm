import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { db } from "./db";
import { Prisma } from "@prisma/client";

// Re-export requireApiKey from api-key-auth for backward compatibility.
// Many v1 API routes import { requireApiKey } from "@/lib/api-utils".
export { requireApiKey } from "./api-key-auth";

/**
 * Typed user object extracted from the session.
 * Eliminates the 73 `(session!.user as any).id` casts across the codebase.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  username: string;
  role: string;
  balance: number;
  heldBalance: number;
  status: string;
  currency?: string;
  language?: string;
  country?: string;
  lifetimeEarnings?: number;
}

/**
 * Typed auth result — either { user, session } on success or { error } on failure.
 */
export type AuthResult =
  | { user: AuthUser; session: any; error: null }
  | { user: null; session: null; error: NextResponse };

/**
 * Get the base URL for the current request.
 *
 * SEC FIX (H-002): previously used x-forwarded-proto + x-forwarded-host
 * headers, which are client-forgeable. If the Node port is exposed
 * directly (bypassing Cloudflare/nginx), an attacker could spoof these
 * headers to make password-reset and email-verification URLs point to
 * their domain → account takeover.
 *
 * Now prefers NEXTAUTH_URL (a server-side env constant that cannot be
 * spoofed). Only falls back to headers if NEXTAUTH_URL is not set
 * (e.g., during local development).
 */
export async function getBaseUrl(): Promise<string> {
  // Prefer the server-side env var (secure, not forgeable)
  const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl;

  // Fallback for local dev where NEXTAUTH_URL might not be set
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

/**
 * Extract a typed AuthUser from a NextAuth session.
 * Returns null if the session or user is missing.
 */
function extractUser(session: any): AuthUser | null {
  if (!session?.user) return null;
  const u = session.user as any;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    username: u.username,
    role: u.role,
    balance: u.balance ?? 0,
    heldBalance: u.heldBalance ?? 0,
    status: u.status ?? "active",
    currency: u.currency,
    language: u.language,
    country: u.country,
    lifetimeEarnings: u.lifetimeEarnings,
  };
}

/**
 * Require an authenticated user.
 * Returns { user, session, error } — use `user.id` directly (no `as any` cast).
 *
 * Usage:
 *   const { user, error } = await requireAuth();
 *   if (error) return error;
 *   // user.id, user.email, user.role, etc. are all typed
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  const user = extractUser(session);
  if (!user) {
    return {
      user: null,
      session: null,
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { user, session, error: null };
}

/**
 * Require an admin user.
 * Returns { user, session, error } — same shape as requireAuth but
 * also checks that user.role === "admin".
 */
export async function requireAdmin(): Promise<AuthResult> {
  const { user, session, error } = await requireAuth();
  if (error) return { user: null, session: null, error };
  if (user.role !== "admin") {
    return {
      user: null,
      session: null,
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }
  return { user, session, error: null };
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
