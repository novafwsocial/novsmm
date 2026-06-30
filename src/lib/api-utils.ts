import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";

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
