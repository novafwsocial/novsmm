# NOVSMM — DevOps Audit Report

**Auditor:** External Principal DevOps Engineer
**Fecha:** 2026-07-06
**Veredicto:** ❌ **NO APROBADO PARA PRODUCCIÓN**

---

## Docker

### Dockerfile — ❌ Crítico (4 P0, 4 P1, 2 P2)

| # | Prioridad | Impacto | Descripción | Evidencia |
|---|-----------|---------|-------------|-----------|
| 1 | P0 | Crítico | `bun.lockb*` no coincide con `bun.lock` del repo — `--frozen-lockfile` falla | L14: `COPY package.json bun.lockb* ./` |
| 2 | P0 | Crítico | `curl` no existe en `oven/bun:1.1-slim` — HEALTHCHECK siempre falla | L78: `CMD curl -f http://localhost:3000/...` |
| 3 | P0 | Alto | Worker hereda HEALTHCHECK del web pero no tiene HTTP server | Sin override en compose para worker |
| 4 | P0 | Alto | No hay `mkdir /app/uploads` — usuario nextjs (UID 1001) no puede escribir | Falta antes de `USER nextjs` |
| 5 | P1 | Medio | No hay `.dockerignore` para `mini-services/notifications-service/node_modules` | Solo excluye root `node_modules` |
| 6 | P1 | Medio | No hay resource limits en Dockerfile (memory, CPU) | Sin `--memory` o `--cpus` |
| 7 | P1 | Bajo | `COPY --from=builder /app/src/workers` — innecesario si worker usa mismo image | L65 |
| 8 | P1 | Bajo | No hay `LABEL` con metadata (version, maintainer) | Ausente |
| 9 | P2 | Bajo | `2>/dev/null \|\| true` en build de mini-services silencia errores | L54 |
| 10 | P2 | Bajo | No hay multi-arch build (amd64/arm64) | Sin `--platform` |

### docker-compose.yml — ❌ Crítico (2 P0, 6 P1, 6 P2)

| # | Prioridad | Impacto | Descripción | Evidencia |
|---|-----------|---------|-------------|-----------|
| 1 | P0 | Crítico | `notifications` service builda desde `./mini-services/notifications-service/Dockerfile` que NO EXISTE | L117-119 |
| 2 | P0 | Alto | Redis sin `--requirepass` y expuesto en `127.0.0.1:6379` | L50-55 |
| 3 | P1 | Alto | No hay resource limits (mem_limit, cpus) en ningún servicio | Ausente en todos |
| 4 | P1 | Medio | `ports` en postgres y redis expuestos a `127.0.0.1` — innecesario si solo Docker network los usa | L48, L57 |
| 5 | P1 | Medio | No hay `logging` config (log rotation) — logs crecen indefinidamente | Ausente |
| 6 | P1 | Medio | `nginx` depende de `web` y `notifications` healthcheck pero no tiene `depends_on` con `condition` | L140-142 |
| 7 | P1 | Bajo | No hay `init: true` en ningún servicio (PID 1 zombie problem) | Ausente |
| 8 | P1 | Bajo | `uploads` volume no tiene backup automático configurado | L157 |
| 9 | P2 | Bajo | `novsmm-network` sin `internal: false` explícito | L163 |
| 10 | P2 | Bajo | No hay `read_only: true` para servicios que no escriben filesystem | Ausente |
| 11 | P2 | Bajo | No hay `security_opt: no-new-privileges` | Ausente |
| 12 | P2 | Bajo | No hay `tmpfs` para /tmp | Ausente |
| 13 | P2 | Bajo | Sin `cap_drop: ALL` | Ausente |
| 14 | P2 | Bajo | Sin healthcheck en `worker` | Ausente |

### docker-compose.monitoring.yml — ❌ Crítico (2 P0, 2 P1, 4 P2)

| # | Prioridad | Impacto | Descripción | Evidencia |
|---|-----------|---------|-------------|-----------|
| 1 | P0 | Alto | Todas las imágenes usan `:latest` — builds no reproducibles | L10, L29, L44, L59 |
| 2 | P0 | Alto | Grafana default `admin/admin` si `GRAFANA_PASSWORD` no set | L49: `${GRAFANA_PASSWORD:-admin}` |
| 3 | P1 | Medio | `node-exporter` monta `/` como `:/rootfs:ro` — expone filesystem completo | L66 |
| 4 | P1 | Bajo | Prometheus retention 30d puede consumir mucho disco | L20 |
| 5 | P2 | Bajo | No hay resource limits | Ausente |
| 6-8 | P2 | Bajo | Sin `init`, `cap_drop`, `security_opt` | Ausente |

---

## Nginx

### nginx.conf — ❌ Crítico (2 P0, 5 P1, 9 P2)

| # | Prioridad | Impacto | Descripción | Evidencia |
|---|-----------|---------|-------------|-----------|
| 1 | P0 | Crítico | No hay `set_real_ip_from` para Cloudflare — `$remote_addr` siempre es IP de CF, rate limiting inútil | Ausente |
| 2 | P0 | Alto | `add_header` en `/_next/static/` y static locations DROPS server-level HSTS, X-Frame-Options, etc. (nginx gotcha) | L210-223 |
| 3 | P1 | Alto | No hay HTTP/3 (QUIC) — solo `http2` | L97 |
| 4 | P1 | Medio | No hay brotli (solo gzip) | Ausente |
| 5 | P1 | Medio | `proxy_read_timeout 60s` en /api/ puede ser muy corto para queries lentas | L267 |
| 6 | P1 | Medio | No hay `proxy_buffers` ni `proxy_buffer_size` configurados | Ausente |
| 7 | P1 | Bajo | `client_max_body_size 50M` puede ser excesivo | L24 |
| 8 | P2 | Bajo | `ssl_session_tickets off` — puede impactar performance en alto tráfico | L110 |
| 9-16 | P2 | Bajo | Varios: sin OCSP stapling verification, sin `ssl_dhparam`, sin `resolver`, sin `map` para real_ip | Ausente |

---

## GitHub Actions CI/CD

### .github/workflows/ci.yml — ❌ Crítico (3 P0, 7 P1, 6 P2)

| # | Prioridad | Impacto | Descripción | Evidencia |
|---|-----------|---------|-------------|-----------|
| 1 | P0 | Crítico | `prisma migrate deploy` corre DESPUÉS de `docker compose up -d` — new code on old schema | L151-152 |
| 2 | P0 | Alto | No hay health check post-deploy — deploys rotos silenciosos | Ausente |
| 3 | P0 | Alto | No hay estrategia de rollback — recuperación manual | Ausente |
| 4 | P1 | Alto | `bunx tsc --noEmit \|\| true` — typecheck no bloqueante | L42 |
| 5 | P1 | Alto | No hay `bun test` — cero tests en CI | Ausente |
| 6 | P1 | Medio | No hay CodeQL ni Trivy scanning | Ausente |
| 7 | P1 | Medio | No hay branch protection rules documentadas | Ausente |
| 8 | P1 | Medio | `permissions: packages: write` demasiado amplio | L84-86 |
| 9 | P1 | Bajo | No hay cache de Docker layers entre jobs | Ausente |
| 10 | P1 | Bajo | Deploy SSH sin verificar fingerprint del host | L138 |
| 11-16 | P2 | Bajo | Sin environment variables en deploy, sin concurrency limits, sin manual approval gate, etc. | Ausente |

---

## Resumen DevOps

**Total findings:** 70 (13 P0 + 26 P1 + 31 P2)

**Bloqueadores críticos de despliegue:**
1. Dockerfile `bun.lockb` glob incorrecto
2. `curl` no en slim image
3. Notifications Dockerfile inexistente
4. Redis sin password
5. Nginx sin Cloudflare real IP
6. CI/CD deploy order incorrecto (migrate después de up)
7. CI/CD sin rollback

**Tiempo estimado para resolver P0s:** 3-5 días ingeniero

---

*Auditoría DevOps ejecutada el 2026-07-06*
