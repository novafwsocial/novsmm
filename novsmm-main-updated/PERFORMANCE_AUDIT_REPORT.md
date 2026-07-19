# NOVSMM — Performance Audit Report

**Auditor:** External Performance Engineer & SRE
**Fecha:** 2026-07-06
**Veredicto:** ❌ **NO APROBADO PARA PRODUCCIÓN** — 4 P0s bloquean go-live

---

## Resumen

| Severidad | Cantidad |
|-----------|----------|
| ❌ P0 Crítico | 4 |
| ⚠️ P1 Alto | 9 |
| ⚠️ P2 Medio | 14 |
| **TOTAL** | **27** |

---

## P0 Críticos

### PERF-P0-1: CSV exports sin límite — OOM a escala
- **Archivos:** `src/app/api/admin/logs/route.ts` + `src/app/api/export/route.ts`
- **Impacto:** Crítico | **Confianza:** Alto
- **Descripción:** Ambos endpoints hacen `findMany()` sin `take` y construyen un CSV string completo en memoria. A 50K+ filas, el proceso se queda sin memoria (OOM Kill).
- **Evidencia:** `admin/logs/route.ts`: `findMany({ where })` sin take; `export/route.ts`: `findMany({ where: { userId } })` sin take
- **Riesgo:** Un admin exportando logs o un usuario exportando datos puede tirar el servidor.
- **Cómo fixar:** Usar `ReadableStream` + cursor pagination. Stream filas al response en vez de acumular en memoria.

### PERF-P0-2: Métricas Prometheus son dead code — 0 callers
- **Archivo:** `src/lib/metrics.ts`
- **Impacto:** Alto | **Confianza:** Alto (grep-verified)
- **Descripción:** Se definen 7 métricas custom (`httpRequestCounter`, `httpRequestDuration`, `dbQueryDuration`, `cacheCounter`, `queueJobCounter`, `queueJobDuration`, `wsConnectionsGauge`) pero **NINGUNA es llamada desde ningún archivo**. `/api/metrics` solo retorna métricas default de Node.js.
- **Evidencia:** `grep -rn "recordHttpRequest\|recordCacheOp\|recordQueueJob" src/` → 0 resultados fuera de `metrics.ts`
- **Riesgo:** El dashboard de Grafana estará vacío. No hay visibilidad de HTTP latency, cache hit rate, queue depth, etc. La plataforma está ciega en producción.
- **Cómo fixar:**
  1. Llamar `recordHttpRequest()` al final de cada API route (o en `withErrorHandler`)
  2. Llamar `recordCacheOp()` desde `cache.ts` en cada get/set/delete
  3. Llamar `recordQueueJob()` desde `worker.ts` en cada job completado/fallido
  4. Agregar `instrumentation.ts` con Prisma `$extends` para `dbQueryDuration`

### PERF-P0-3: /api/health/ready calcula memory check pero no lo usa
- **Archivo:** `src/app/api/health/ready/route.ts`
- **Impacto:** Alto | **Confianza:** Alto
- **Descripción:** El endpoint calcula `checks.memory.healthy = memUsage.heapUsed < memUsage.heapTotal * 0.95` pero `allHealthy` solo se setea a `false` si la DB falla. Memory al 99% retorna 200 "ready".
- **Evidencia:** `allHealthy` solo se modifica en el try/catch de database
- **Riesgo:** k8s/docker no remueve el contenedor del load balancer cuando la memoria está al 99% → OOM kill en producción.
- **Cómo fixar:** Agregar `if (!checks.memory.healthy) allHealthy = false;` antes del return.

### PERF-P0-4: admin-panel.tsx — 2831 líneas / 136KB en un solo bundle
- **Archivo:** `src/components/novsmm/admin-panel.tsx`
- **Impacto:** Alto | **Confianza:** Alto
- **Descripción:** 22 tabs de admin en un solo archivo client-side. Sin `React.lazy`, sin `React.memo`, sin code-splitting. Cada visitante del admin descarga 136KB (gzipped) de JS que no necesita.
- **Riesgo:** LCP > 3s en móviles. Tiempo de compilación alto. Difícil mantener.
- **Cómo fixar:** `React.lazy(() => import('./admin/Overview'))` por cada tab. Memoizar subcomponentes.

---

## P1 Altos

| # | Archivo | Descripción | Impacto |
|---|---------|-------------|---------|
| 1 | `lib/auth.ts` | Redis down → DB hit en cada request autenticada. Multi-instance: 7× DB load | Medio |
| 2 | `lib/orders.ts` | setTimeout chains en fallback mode bloquean event loop | Medio |
| 3 | `lib/logger.ts` | 86 calls a `console.error` en 32 archivos — logger bypassado | Alto |
| 4 | `lib/sentry.ts` | `withErrorHandler` usado por 0 routes — Sentry ciego | Alto |
| 5 | `next.config.ts` | Falta `optimizePackageImports` (lucide, recharts, framer-motion) | Alto |
| 6 | API routes | Sin log rotation — `tee dev.log/server.log` crece indefinidamente | Alto |
| 7 | API routes | No hay webhook replay — Cloudflare/provider outage = payment credits lost | Alto |
| 8 | `lib/orders.ts` | 4 N+1 `findUnique/update` por orden en simulateFulfillment | Medio |
| 9 | `api/admin/overview` | Health percentages HARDCODED (fake data) | Medio |

---

## Escenarios de Fallo en Producción

| Escenario | Comportamiento | Severidad |
|-----------|---------------|-----------|
| **Redis cae** | Cache/rate-limit/queues caen a in-memory. Worker exits → fallback setImmediate → event loop risk. Multi-instance: 7× DB load | ⚠️ P1 |
| **PostgreSQL cae** | Todo 500. /api/health/ready → 503 (correcto). Sin circuit breaker — 10s hang por request. Webhooks no pueden escribir WebhookLog → payment credits lost | ❌ P0 |
| **Worker crashea** | BullMQ: stalled jobs re-processed after 30s. DLQ after 3 retries. Fallback: in-flight setImmediate jobs LOST → orders stuck in "processing" | ⚠️ P1 |
| **Disco lleno** | Logs crecen indefinidamente. SQLite/Postgres WAL halt. Backups fail silently | ❌ P0 |
| **Memoria llena** | /api/health/ready retorna 200 (bug). GC pressure → OOM kill | ❌ P0 |
| **SSL vence** | nginx TLS handshake fails. No cert-manager / no TTL alert | ⚠️ P1 |
| **Cloudflare cae** | Clients can't reach origin. Webhooks lost. No replay job | ❌ P0 |
| **Webhooks fallan** | WebhookLog stores payload. Stripe/MP retry. NowPayments NO retry. No idempotency replay job | ❌ P0 |
| **SMTP falla** | `createNotification({sendEmail:true})` awaits sendEmail → bloquea. Fallback: 60s timeout | ⚠️ P1 |

---

## Lo que está bien hecho ✅

- ✅ Cache layer con graceful degradation bien concebido
- ✅ Polling intervals razonables (60s dashboard, 30s notifications)
- ✅ `select()` añadido a hot endpoints (orders, wallet, notifications, dashboard)
- ✅ Cache-Control headers en APIs públicas
- ✅ Rate limiter con sliding window (Redis) + fixed window (fallback)
- ✅ BullMQ queues con retries + backoff + DLQ
- ✅ `withErrorHandler` HOC bien diseñado (aunque no usado)

---

## Próximos pasos

1. **Wire observability stack** (P0): conectar metrics, logger y Sentry a los 71 API routes
2. **Stream CSV exports** (P0): `ReadableStream` + cursor pagination
3. **Fix readiness probe** (P0): memory check debe gate 503
4. **Code-split admin-panel.tsx** (P0): `React.lazy` por tab
5. **Replace `console.error`** con `logger` en 32 archivos (P1)
6. **Add webhook replay cron** (P1)
7. **Run k6 load test** antes de go-live

---

*Auditoría de performance ejecutada el 2026-07-06*
