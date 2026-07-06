import { NextResponse } from "next/server";
import { getMetrics, getMetricsContentType } from "@/lib/metrics";

/**
 * GET /api/metrics — Prometheus metrics endpoint.
 *
 * Returns metrics in Prometheus exposition format (text/plain).
 * Scraped by Prometheus/Grafana for dashboards and alerting.
 *
 * SECURITY: This endpoint should be protected in production. Either:
 *   1. Restrict by IP (allow only Prometheus scraper IP)
 *   2. Require basic auth (METRICS_BASIC_AUTH env var)
 *   3. Put behind the internal network only
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

// Optional basic auth protection
const METRICS_AUTH = process.env.METRICS_BASIC_AUTH;

export async function GET(req: Request) {
  // ── Auth check (optional) ──
  if (METRICS_AUTH) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new NextResponse(null, {
        status: 401,
        headers: { "WWW-Authenticate": "Basic realm=\"metrics\"" },
      });
    }
    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    if (decoded !== METRICS_AUTH) {
      return new NextResponse(null, { status: 403 });
    }
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
