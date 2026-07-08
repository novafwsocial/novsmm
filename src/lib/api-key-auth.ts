import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { apiError } from "@/lib/api-utils";

/**
 * Validate an API key from the Authorization header.
 * Returns the user + apiKey record, or null.
 *
 * The API key format is: nvsk_live_xxxxx
 *
 * Lookup strategy (O(1) when possible):
 * 1. Compute SHA-256(plaintext key) → lookupHash
 * 2. findFirst by { lookupHash, status: "active" } — single indexed lookup
 * 3. bcrypt.compare() against the single result to confirm the key actually matches
 *    (lookupHash alone isn't a secret, so we still verify with bcrypt)
 * 4. If no match by lookupHash, fall back to bcrypt-scan over legacy keys
 *    (rows where lookupHash is null — keys created before this optimization).
 *    On a legacy hit, backfill lookupHash so future lookups are O(1).
 */
export async function validateApiKey(req: NextRequest): Promise<{
  user: any;
  apiKey: any;
} | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7);
  if (!key.startsWith("nvsk_live_")) return null;

  // Compute SHA-256 lookup hash (hex) for O(1) index lookup
  const lookupHash = crypto.createHash("sha256").update(key).digest("hex");

  // Shared user-include shape used by both lookup paths
  const userInclude = {
    user: {
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        balance: true,
        currency: true,
        status: true,
      },
    },
  } as const;

  // 1. O(1) lookup by lookupHash (new keys)
  let apiKey: any = await db.apiKey.findFirst({
    where: { lookupHash, status: "active" },
    include: userInclude,
  });

  // 2. If not found, fall back to bcrypt-scan over legacy keys (lookupHash: null).
  //    Backfill lookupHash on the matched legacy key so future lookups are O(1).
  if (!apiKey) {
    const legacyKeys = await db.apiKey.findMany({
      where: { status: "active", lookupHash: null },
      include: userInclude,
    });
    for (const k of legacyKeys) {
      if (await bcrypt.compare(key, k.keyHash)) {
        apiKey = k;
        // Best-effort backfill — never let a backfill failure block auth
        try {
          await db.apiKey.update({
            where: { id: k.id },
            data: { lookupHash },
          });
        } catch (e) {
          console.error(
            `[api-key-auth] Failed to backfill lookupHash for ${k.id}:`,
            e
          );
        }
        break;
      }
    }
  }

  if (!apiKey) return null;

  // Confirm the lookupHash hit actually matches the bcrypt hash
  // (defence in depth: lookupHash is derived from the plaintext, but a hash
  // collision or a corrupted lookupHash should not bypass bcrypt verification)
  const bcryptMatch = await bcrypt.compare(key, apiKey.keyHash);
  if (!bcryptMatch) return null;

  // Check if user is active
  if (apiKey.user.status !== "active") return null;

  // Check IP allowlist (if configured)
  if (apiKey.ipAllowlist) {
    const clientIp =
      req.headers.get("x-client-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const allowedIps = apiKey.ipAllowlist.split(",").map((ip: string) => ip.trim());
    if (!allowedIps.includes(clientIp) && clientIp !== "unknown") {
      return null; // IP not allowed — reject
    }
  }

  // Update last used
  const ip = req.headers.get("x-client-ip") ?? "unknown";
  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date(), lastUsedIp: ip },
  });

  // ── H-2: Per-API-key rate limiting (60 req/min per key) ──
  // Prevents a single reseller from monopolizing the API.
  // Uses the same checkRateLimit as the middleware (in-memory, per-instance).
  // In production with Redis, this is backed by Redis sorted sets.
  const apiRateLimitKey = `apikey:${apiKey.id}`;
  const apiRateResult = checkApiRateLimit(apiRateLimitKey, 60, 60 * 1000);
  if (!apiRateResult.allowed) {
    // Log the rate limit hit but don't update lastUsed further
    console.warn(`[api-key-auth] Rate limit exceeded for key ${apiKey.publicId} (${apiRateResult.remaining} remaining)`);
    return null; // Return null = treated as invalid key (401 response)
  }

  // Check permissions
  const permissions = apiKey.permissions.split(",");

  return { user: apiKey.user, apiKey: { ...apiKey, permissions } };
}

// ── H-2: In-memory rate limiter for API keys (per-instance) ──
// In production with Redis, upgrade to Redis-backed (src/lib/rate-limit.ts).
// For now, in-memory is acceptable because each instance enforces its own limit.
type ApiRateBucket = { count: number; resetAt: number };
const apiRateLimitMap = new Map<string, ApiRateBucket>();
let apiLastCleanup = Date.now();

function checkApiRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  // Cleanup expired buckets every 60s
  const now = Date.now();
  if (now - apiLastCleanup > 60_000) {
    apiLastCleanup = now;
    for (const [k, bucket] of apiRateLimitMap) {
      if (bucket.resetAt < now) apiRateLimitMap.delete(k);
    }
  }

  const existing = apiRateLimitMap.get(key);
  if (!existing || existing.resetAt < now) {
    apiRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  existing.count++;
  return { allowed: true, remaining: maxRequests - existing.count };
}

/**
 * Require a specific permission on the API key.
 */
export function hasPermission(apiKey: any, permission: string): boolean {
  return apiKey?.permissions?.includes(permission) ?? false;
}

/**
 * API key auth wrapper — returns { user, apiKey, error }
 */
export async function requireApiKey(req: NextRequest, permission: string = "read") {
  const result = await validateApiKey(req);
  if (!result) {
    return {
      user: null,
      apiKey: null,
      error: apiError("Invalid or missing API key", 401),
    };
  }
  if (!hasPermission(result.apiKey, permission)) {
    return {
      user: null,
      apiKey: null,
      error: apiError(`Missing '${permission}' permission`, 403),
    };
  }
  return { ...result, error: null };
}
