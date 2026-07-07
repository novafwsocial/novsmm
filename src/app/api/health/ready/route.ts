import { db } from "@/lib/db";
import { isRedisAvailable, getRedis } from "@/lib/redis";
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
 * Response:
 *   200: { status: "ready" | "degraded", checks: { database, redis } }
 *   503: { error: "Not ready", details: { ... } }
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
    checks.database = { healthy: false, error: e.message };
    allHealthy = false;
  }

  // ── Redis check (NON-CRITICAL — degraded, not unhealthy) ──
  try {
    if (isRedisAvailable()) {
      const redis = await getRedis();
      if (redis) {
        const redisStart = Date.now();
        const pong = await redis.ping();
        checks.redis = { healthy: pong === "PONG", latencyMs: Date.now() - redisStart };
      } else {
        checks.redis = { healthy: false, error: "Redis not connected" };
      }
    } else {
      // Redis not configured — this is fine (sandbox/dev mode)
      checks.redis = { healthy: true, error: "not configured (in-memory mode)" };
    }
  } catch (e: any) {
    checks.redis = { healthy: false, error: e.message };
    // Redis being down is NOT critical — mark as degraded but still return 200
  }

  // ── Memory check ──
  const memUsage = process.memoryUsage();
  checks.memory = {
    healthy: memUsage.heapUsed < memUsage.heapTotal * 0.95, // <95% heap usage
    heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    rssMB: Math.round(memUsage.rss / 1024 / 1024),
  };

  const status = allHealthy ? "ready" : "not_ready";
  const response = {
    status,
    checks,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    totalLatencyMs: Date.now() - start,
  };

  if (!allHealthy) {
    return apiError("Service not ready", 503);
  }

  return apiOk(response);
}
