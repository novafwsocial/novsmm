import { apiOk, apiError } from "@/lib/api-utils";

/**
 * GET /api/health/live — Liveness probe.
 *
 * Returns 200 if the process is alive and can respond to HTTP requests.
 * Used by k8s/docker livenessProbe — if this fails, the container is restarted.
 *
 * This endpoint does NOT check dependencies (DB, Redis) — it only verifies
 * that the Node.js process is alive. Dependency checks are in /api/health/ready.
 *
 * Response: { status: "alive", uptime: <seconds>, pid: <number> }
 */
export async function GET() {
  return apiOk({
    status: "alive",
    uptime: Math.floor(process.uptime()),
    pid: process.pid,
    timestamp: new Date().toISOString(),
  });
}
