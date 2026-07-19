import { NextResponse } from "next/server";
import { getMetrics, getMetricsContentType } from "@/lib/metrics";

/**
 * GET /api/metrics — Prometheus metrics endpoint.
 *
 * Returns metrics in Prometheus exposition format (text/plain).
 * Scraped by Prometheus/Grafana for dashboards and alerting.
 *
 * SECURITY (OWASP A01-1, P1): Authentication is MANDATORY. The endpoint
 * requires HTTP Basic Auth via the `METRICS_BASIC_AUTH` env var
 * (format: `username:password`). If the env var is not set, the endpoint
 * returns 503 Service Unavailable (fail-closed) — never leaks metrics.
 *
 * For IP-allowlisting, configure the reverse proxy (Caddy/nginx) to
 * restrict `/api/metrics` to the Prometheus scraper IP.
 *
 * Metrics collected:
 *   - novsmm_http_requests_total (counter: method, route, status)
 *   - novsmm_http_request_duration_seconds (histogram: method, route, status)
 *   - novsmm_db_query_duration_seconds (histogram: operation, model)
 *   - novsmm_cache_operations_total (counter: operation, result)
 *   - novsmm_queue_jobs_total (counter: queue, status)
 *   - novsmm_queue_job_duration_seconds (histogram: queue)
 *   - novsmm_ws_connections (gauge)
 *   - novsmm_active_orders (gauge)
 *   - Default Node.js metrics (process_cpu_*, process_memory_*, nodejs_*)
 */

// Mandatory basic auth protection — value is "username:password".
const METRICS_AUTH = process.env.METRICS_BASIC_AUTH;

export async function GET(req: Request) {
  // ── Fail-closed: if no auth is configured, return 503 ──
  // Operators MUST set METRICS_BASIC_AUTH in production. Leaving the
  // endpoint open would leak internal architecture, route inventory,
  // queue names, model names, process PID/uptime, etc.
  if (!METRICS_AUTH) {
    return new NextResponse(
      JSON.stringify({
        error: "metrics endpoint not configured",
        message: "Set METRICS_BASIC_AUTH env var to enable the /api/metrics endpoint.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  }

  // ── Mandatory basic auth ──
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse(null, {
      status: 401,
      headers: { "WWW-Authenticate": "Basic realm=\"metrics\"" },
    });
  }

  // Use constant-time comparison to prevent timing attacks.
  const encoded = authHeader.slice(6);
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  if (!constantTimeEqual(decoded, METRICS_AUTH)) {
    return new NextResponse(null, { status: 403 });
  }

  const metrics = await getMetrics();
  return new NextResponse(metrics, {
    status: 200,
    headers: {
      "Content-Type": getMetricsContentType(),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

/**
 * Constant-time string comparison to prevent timing attacks on the
 * basic-auth credential check.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
