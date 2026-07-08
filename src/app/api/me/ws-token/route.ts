import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import jwt from "jsonwebtoken";

/**
 * GET /api/me/ws-token
 *
 * Returns a short-lived JWT (5 minutes) that the client can pass to the
 * WebSocket notifications service for authentication.
 *
 * The WS service verifies this JWT on connection and joins the user to
 * a per-user room ("user:{userId}") so they only receive THEIR notifications.
 *
 * SECURITY (M-1 fix):
 *   - JWT is signed with NEXTAUTH_SECRET (same as NextAuth's JWT)
 *   - TTL is 5 minutes (short — client must re-fetch if connection drops later)
 *   - Only authenticated users can get a token
 *   - Token contains userId + exp only (no balance, no email — minimal disclosure)
 *
 * Usage (client):
 *   const res = await fetch("/api/me/ws-token");
 *   const { token } = await res.json();
 *   socket = io("/?XTransformPort=3003&token=" + token, { ... });
 */
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfiguration: NEXTAUTH_SECRET not set" },
      { status: 500 }
    );
  }

  // Generate a short-lived JWT for WS auth
  // Contains: userId, exp (5 minutes). No sensitive data.
  const token = jwt.sign(
    { userId: user.id, ws: true }, // `ws: true` distinguishes from NextAuth JWTs
    secret,
    { expiresIn: "5m" }
  );

  return NextResponse.json({ token, expiresIn: 300 });
}
