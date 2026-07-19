# NOVSMM Observability & Monitoring Guide

This guide covers error tracking, health checks, metrics, and alerting for NOVSMM.

## Overview

| Component | Endpoint | Purpose |
|-----------|----------|---------|
| Liveness probe | `/api/health/live` | Process alive? (k8s livenessProbe) |
| Readiness probe | `/api/health/ready` | Dependencies healthy? (k8s readinessProbe) |
| DB health | `/api/health/db` | Database + Redis connected? |
| User status | `/api/status` | Public status page with stats |
| Metrics | `/api/metrics` | Prometheus exposition format |
| Error tracking | Sentry (optional) | Real-time error capture + alerts |

## Health Endpoints

### `/api/health/live` — Liveness Probe

Returns 200 if the process is alive. No dependency checks.

```json
{
  "status": "alive",
  "uptime": 3600,
  "pid": 12345,
  "timestamp": "2025-01-15T..."
}
```

**k8s config:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
  failureThreshold: 3
```

### `/api/health/ready` — Readiness Probe

Returns 200 only if database is connected. Redis is optional (degraded, not unhealthy).

```json
{
  "status": "ready",
  "checks": {
    "database": { "healthy": true, "latencyMs": 3 },
    "redis": { "healthy": true, "latencyMs": 1 },
    "memory": { "healthy": true, "heapUsedMB": 120, "heapTotalMB": 256, "rssMB": 350 }
  },
  "uptime": 3600,
  "totalLatencyMs": 8
}
```

**k8s config:**
```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
```

### `/api/health/db` — Database Health

Returns 200 if database is connected, 503 if not. Also checks Redis (optional).

```json
{
  "status": "healthy",
  "database": { "connected": true, "latencyMs": 3, "provider": "sqlite" },
  "redis": { "connected": false },
  "timestamp": "2025-01-15T..."
}
```

## Prometheus Metrics

### `/api/metrics` — Metrics Endpoint

Returns metrics in Prometheus exposition format. Scraped by Prometheus/Grafana.

**Security:** Set `METRICS_BASIC_AUTH=user:password` in `.env` to require basic auth.

**Metrics collected:**

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `novsmm_http_requests_total` | Counter | method, route, status | Total HTTP requests |
| `novsmm_http_request_duration_seconds` | Histogram | method, route, status | HTTP request latency |
| `novsmm_db_query_duration_seconds` | Histogram | operation, model | DB query latency |
| `novsmm_cache_operations_total` | Counter | operation, result | Cache hit/miss |
| `novsmm_queue_jobs_total` | Counter | queue, status | Queue jobs processed |
| `novsmm_queue_job_duration_seconds` | Histogram | queue | Queue job latency |
| `novsmm_ws_connections` | Gauge | — | Current WebSocket connections |
| `novsmm_active_orders` | Gauge | — | Orders in processing status |
| `novsmm_process_cpu_*` | Default | — | CPU usage |
| `novsmm_process_memory_*` | Default | — | Memory usage |
| `novsmm_nodejs_*` | Default | — | Node.js runtime metrics |

**Prometheus scrape config:**
```yaml
scrape_configs:
  - job_name: "novsmm"
    scrape_interval: 15s
    metrics_path: /api/metrics
    static_configs:
      - targets: ["localhost:3000"]
    basic_auth:
      username: "prometheus"
      password: "your_password"
```

## Sentry Error Tracking

### Setup

1. Create a Sentry account at https://sentry.io
2. Create a new Node.js project
3. Copy the DSN from Project Settings → Client Keys
4. Add to `.env`:
   ```
   SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
   SENTRY_ENVIRONMENT=production
   SENTRY_RELEASE=0.2.0
   ```
5. Restart the app — errors now flow to Sentry automatically

### How it works

- All 5xx errors caught by `withErrorHandler` are automatically captured
- 4xx errors (validation, auth, not-found) are NOT sent to Sentry (expected user errors)
- Each error includes: request-id, method, URL, stack trace, user context
- Sensitive fields (passwords, tokens) are NOT sent (pino redaction + Sentry sendDefaultPii: false)

### Manual capture

```typescript
import { captureException } from "@/lib/sentry";

try {
  await riskyOperation();
} catch (e) {
  await captureException(e, {
    userId: "123",
    tags: { component: "payment" },
    extra: { amount: 100, method: "stripe" },
  });
}
```

### User context

```typescript
import { setSentryUser, clearSentryUser } from "@/lib/sentry";

// On login:
await setSentryUser({ id: user.id, email: user.email, username: user.username });

// On logout:
await clearSentryUser();
```

## Grafana Dashboards

### Import the Prometheus data source

1. In Grafana: Connections → Data Sources → Add Prometheus
2. URL: `http://prometheus:9090`
3. Save & Test

### Key dashboards to create

**System Overview:**
- HTTP request rate (req/s): `rate(novsmm_http_requests_total[5m])`
- Error rate (5xx): `rate(novsmm_http_requests_total{status=~"5.."}[5m])`
- p95 latency: `histogram_quantile(0.95, rate(novsmm_http_request_duration_seconds_bucket[5m]))`
- Active WebSocket connections: `novsmm_ws_connections`

**Database:**
- Query rate: `rate(novsmm_db_query_duration_seconds_count[5m])`
- p95 query latency: `histogram_quantile(0.95, rate(novsmm_db_query_duration_seconds_bucket[5m]))`

**Cache:**
- Hit rate: `rate(novsmm_cache_operations_total{result="hit"}[5m]) / rate(novsmm_cache_operations_total{result="hit"}[5m] + rate(novsmm_cache_operations_total{result="miss"}[5m]))`

**Queues:**
- Jobs processed/min: `rate(novsmm_queue_jobs_total[5m]) * 60`
- Job failure rate: `rate(novsmm_queue_jobs_total{status="failed"}[5m])`
- p95 job duration: `histogram_quantile(0.95, rate(novsmm_queue_job_duration_seconds_bucket[5m]))`

## Alerting

### Critical alerts (PagerDuty/Slack)

| Alert | Condition | Severity |
|-------|-----------|----------|
| Service down | `up{job="novsmm"} == 0` for 1m | Critical |
| High error rate | `rate(novsmm_http_requests_total{status=~"5.."}[5m]) > 0.01` for 2m | Critical |
| DB unreachable | `novsmm_database_healthy == 0` for 1m | Critical |
| High p95 latency | `histogram_quantile(0.95, ...) > 2` for 5m | Warning |
| Queue DLQ growing | `rate(novsmm_queue_jobs_total{status="failed"}[5m]) > 0.1` for 5m | Warning |
| Memory high | `novsmm_process_memory_heap_bytes / novsmm_process_memory_heap_total > 0.9` for 5m | Warning |

### Slack alerting example (Prometheus AlertManager)

```yaml
route:
  receiver: "slack"
  group_by: ["alertname"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h

receivers:
  - name: "slack"
    slack_configs:
      - api_url: "https://hooks.slack.com/services/..."
        channel: "#novsmm-alerts"
        send_resolved: true
```

## Docker Health Check

Add to docker-compose.yml:

```yaml
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health/ready"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
```

## Summary

NOVSMM now has full observability:
- **Health checks**: 3 endpoints (live, ready, db) for k8s/docker/load balancer
- **Metrics**: Prometheus endpoint with HTTP, DB, cache, queue, and system metrics
- **Error tracking**: Sentry integration (optional, graceful degradation)
- **Structured logging**: pino with request-id propagation (Phase 5)
- **Alerting**: Ready for Prometheus AlertManager + Slack/PagerDuty
