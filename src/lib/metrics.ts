import promClient from "prom-client";

/**
 * Prometheus metrics collection.
 *
 * Collects:
 *   - HTTP request count (by method, route, status)
 *   - HTTP request duration histogram (by method, route)
 *   - DB query duration histogram
 *   - Redis cache hit/miss counter
 *   - BullMQ queue job count + duration
 *   - WebSocket connection count
 *   - Default Node.js metrics (CPU, memory, event loop)
 *
 * Exposed at /api/metrics in Prometheus exposition format.
 *
 * USAGE in API routes:
 *   import { recordHttpRequest } from "@/lib/metrics";
 *   recordHttpRequest("GET", "/api/orders", 200, durationMs);
 */

// ── Registry ──
const registry = new promClient.Registry();

// ── Default metrics (CPU, memory, GC, event loop) ──
promClient.collectDefaultMetrics({
  register: registry,
  prefix: "novsmm_",
});

// ── HTTP request counter ──
export const httpRequestCounter = new promClient.Counter({
  name: "novsmm_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

// ── HTTP request duration histogram ──
export const httpRequestDuration = new promClient.Histogram({
  name: "novsmm_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// ── DB query duration histogram ──
export const dbQueryDuration = new promClient.Histogram({
  name: "novsmm_db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation", "model"] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

// ── Cache hit/miss counter ──
export const cacheCounter = new promClient.Counter({
  name: "novsmm_cache_operations_total",
  help: "Cache operations (hit/miss/set/delete)",
  labelNames: ["operation", "result"] as const,
  registers: [registry],
});

// ── Queue job counter ──
export const queueJobCounter = new promClient.Counter({
  name: "novsmm_queue_jobs_total",
  help: "Queue jobs processed",
  labelNames: ["queue", "status"] as const,
  registers: [registry],
});

// ── Queue job duration histogram ──
export const queueJobDuration = new promClient.Histogram({
  name: "novsmm_queue_job_duration_seconds",
  help: "Queue job processing duration in seconds",
  labelNames: ["queue"] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [registry],
});

// ── WebSocket connection gauge ──
export const wsConnectionsGauge = new promClient.Gauge({
  name: "novsmm_ws_connections",
  help: "Current WebSocket connections",
  registers: [registry],
});

// ── Active orders gauge ──
export const activeOrdersGauge = new promClient.Gauge({
  name: "novsmm_active_orders",
  help: "Orders in processing/in_progress status",
  registers: [registry],
});

// ── Helpers ──

/**
 * Record an HTTP request.
 * Call this at the end of each API route handler.
 */
export function recordHttpRequest(
  method: string,
  route: string,
  status: number,
  durationMs: number
) {
  const routeNormalized = normalizeRoute(route);
  httpRequestCounter.labels(method, routeNormalized, String(status)).inc();
  httpRequestDuration.labels(method, routeNormalized, String(status)).observe(durationMs / 1000);
}

/**
 * Record a cache operation.
 */
export function recordCacheOp(operation: "get" | "set" | "delete" | "invalidate", result: "hit" | "miss" | "success" | "error") {
  cacheCounter.labels(operation, result).inc();
}

/**
 * Record a queue job.
 */
export function recordQueueJob(queue: string, status: "completed" | "failed" | "retry", durationMs?: number) {
  queueJobCounter.labels(queue, status).inc();
  if (durationMs !== undefined) {
    queueJobDuration.labels(queue).observe(durationMs / 1000);
  }
}

/**
 * Normalize a route path for metrics labeling.
 * Replaces IDs with :id to prevent cardinality explosion.
 * Example: /api/orders/123 → /api/orders/:id
 */
function normalizeRoute(route: string): string {
  return route
    .replace(/\/[a-zA-Z0-9]{20,}/g, "/:id") // cuid IDs
    .replace(/\/\d+/g, "/:id") // numeric IDs
    .replace(/\?.*$/, ""); // query strings
}

/**
 * Get the Prometheus metrics in text format.
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Get the content type for the metrics response.
 */
export function getMetricsContentType(): string {
  return registry.contentType;
}

export { registry };
