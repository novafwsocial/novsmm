import { db } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { apiOk, apiError } from "@/lib/api-utils";

/**
 * GET /api/health/ready — Readiness probe.
 *
 * Returns 200 only if ALL critical dependencies are healthy:
 *   - Database (PostgreSQL/SQLite) — SELECT 1
 *   - Redis (optional — degraded, not unhealthy)
 *
 * Used by k8s/docker readinessProbe — if this fails, the container is removed
 * from the load balancer (but NOT restarted).
 *
 * SECURITY (OWASP A05-2, P2): the PUBLIC response is intentionally MINIMAL.
 * DB error messages (which can leak connection-string structure, private DB
 * IPs, Postgres version) and detailed memory figures (which help attackers
 * time memory-exhaustion DoS) are now logged server-side only. The HTTP
 * response contains only `{ status: "ready" | "not_ready" }`.
 *
 * Operators who need the detailed `checks` object should consult the server
 * logs (or use `/api/metrics` which requires Basic Auth).
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, Record<string, any>> = {};
  let allHealthy = true;

  // ── Database check (CRITICAL) ──
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = { healthy: true, latencyMs: Date.now() - dbStart };
  } catch (e: any) {
    // Log the full error server-side — it can include connection-string
    // structure / DB IP / version info that we don't want to leak.
    console.error("[health/ready] database check failed:", e?.message ?? e);
    checks.database = { healthy: false, error: "database_unreachable" };
    allHealthy = false;
  }

  // ── Redis check (NON-CRITICAL — degraded, not unhealthy) ──
  try {
    // Calling getRedis() also initializes the lazy client. Checking only
    // isRedisAvailable() first would report a false negative after startup.
    const redis = await getRedis();
    if (redis) {
      const redisStart = Date.now();
      const pong = await redis.ping();
      checks.redis = { healthy: pong === "PONG", latencyMs: Date.now() - redisStart };
    } else {
      // Redis not configured — this is fine (sandbox/dev mode)
      checks.redis = {
        healthy: !process.env.REDIS_URL,
        error: process.env.REDIS_URL ? "redis_not_connected" : "not_configured",
      };
    }
  } catch (e: any) {
    console.warn("[health/ready] redis check failed:", e?.message ?? e);
    checks.redis = { healthy: false, error: "redis_unreachable" };
    // Redis being down is NOT critical — mark as degraded but still return 200
  }

  // ── Memory check (logged only — not in response) ──
  const memUsage = process.memoryUsage();
  const memHealthy = memUsage.heapUsed < memUsage.heapTotal * 0.95;
  checks.memory = {
    healthy: memHealthy,
    // Omit the actual heap/rss numbers — they leak capacity info.
  };
  if (!memHealthy) {
    console.warn(
      `[health/ready] high memory usage: heap=${Math.round(memUsage.heapUsed / 1024 / 1024)}MB/${Math.round(memUsage.heapTotal / 1024 / 1024)}MB rss=${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    );
  }

  // Log the full detailed checks object server-side for operators.
  console.info(
    `[health/ready] status=${allHealthy ? "ready" : "not_ready"} totalLatencyMs=${Date.now() - start}`,
    { checks },
  );

  // ── Public response: minimal, no internals ──
  if (!allHealthy) {
    return apiError("Service not ready", 503);
  }

  return apiOk({ status: "ready" });
}
