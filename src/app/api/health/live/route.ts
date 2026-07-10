import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/health/live — Liveness probe.
 *
 * Returns 200 if the process is alive and can respond to HTTP requests.
 * Used by k8s/docker livenessProbe — if this fails, the container is restarted.
 *
 * This endpoint does NOT check dependencies (DB, Redis) — it only verifies
 * that the Node.js process is alive. Dependency checks are in /api/health/ready.
 *
 * SECURITY (OWASP A05-2, P2): the public response is intentionally MINIMAL.
 * Previously this endpoint leaked `pid`, `uptime`, and `timestamp` — which
 * helped attackers fingerprint the process and time attacks. The detailed
 * process info is now only logged server-side; the response is a bare
 * `{ status: "alive" }`.
 *
 * For internal monitoring dashboards that need the detailed metrics, use
 * `/api/metrics` (which requires Basic Auth).
 */
export async function GET() {
  // Server-side log only — never exposed in the response body.
  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[health/live] uptime=${Math.floor(process.uptime())}s pid=${process.pid}`,
    );
  }
  return apiOk({ status: "alive" });
}
