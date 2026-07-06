import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isRedisAvailable, getRedis } from "@/lib/redis";
import { apiOk, apiError } from "@/lib/api-utils";

/**
 * GET /api/health/db — Database health check endpoint.
 *
 * Runs a simple `SELECT 1` query (via Prisma's raw query) to verify
 * the database connection is alive. Used by:
 *   - k8s/docker readiness probes (Phase 8)
 *   - Load balancer health checks
 *   - Monitoring systems (Sentry, uptime monitors)
 *
 * Returns:
 *   200 — database is healthy
 *   503 — database is unreachable
 *
 * Response body:
 *   {
 *     "status": "healthy" | "degraded" | "unhealthy",
 *     "database": { "connected": true, "latencyMs": 3, "provider": "sqlite" },
 *     "redis": { "connected": false },
 *     "timestamp": "2025-01-15T..."
 *   }
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const checks: any = {
    status: "healthy",
    database: { connected: false, latencyMs: 0, provider: "unknown" },
    redis: { connected: false },
    timestamp: new Date().toISOString(),
  };

  // ── Database check ──
  try {
    // Prisma's raw query works on both SQLite and PostgreSQL
    // SQLite: SELECT 1
    // PostgreSQL: SELECT 1
    await db.$queryRaw`SELECT 1`;
    checks.database.connected = true;
    checks.database.latencyMs = Date.now() - start;

    // Detect provider from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl.startsWith("postgresql")) {
      checks.database.provider = "postgresql";
    } else if (dbUrl.startsWith("file:")) {
      checks.database.provider = "sqlite";
    } else {
      checks.database.provider = "unknown";
    }
  } catch (e: any) {
    checks.database.connected = false;
    checks.database.error = e.message;
    checks.status = "unhealthy";
  }

  // ── Redis check (optional — degraded but not unhealthy if down) ──
  try {
    if (isRedisAvailable()) {
      const redis = await getRedis();
      if (redis) {
        const pong = await redis.ping();
        checks.redis.connected = pong === "PONG";
      }
    }
  } catch {
    // Redis is optional — don't mark as unhealthy, just degraded
    if (checks.status === "healthy") {
      checks.status = "degraded";
    }
  }

  // ── Determine HTTP status ──
  // 503 only if the database is down (critical dependency)
  // Redis being down is "degraded" but still returns 200
  const httpStatus = checks.database.connected ? 200 : 503;

  if (httpStatus === 503) {
    return apiError("Database unreachable", 503);
  }

  return apiOk(checks);
}
