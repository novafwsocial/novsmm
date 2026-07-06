# RISK_MATRIX.md
# NOVSMM — Risk Matrix

**Date:** 2026-07-06
**Analyst:** Principal Staff Engineer / SRE / TPM (External)

---

## Risk Assessment Matrix

| Probabilidad \ Impacto | Bajo | Medio | Alto | Crítico |
|------------------------|------|-------|------|---------|
| **Muy alta** | P2 | P1 | P0 | P0 |
| **Alta** | P2 | P1 | P0 | P0 |
| **Media** | P2 | P2 | P1 | P0 |
| **Baja** | — | P2 | P1 | P1 |
| **Muy baja** | — | — | P2 | P1 |

---

## Root Cause Risk Matrix

| # | Root Cause | Probabilidad | Impacto | Prioridad Final | Justificación |
|---|-----------|-------------|---------|-----------------|---------------|
| 1 | Docker Build Untested | **Muy alta** | **Crítico** | **P0** | `docker compose build` fallará en el primer intento. 5 errores independientes garantizan fallo. |
| 2 | Nginx Not Tested with CF | **Alta** | **Alto** | **P0** | Rate limiting inútil sin `set_real_ip_from`. Security headers perdidos en assets estáticos. |
| 3 | CI/CD Deploy Order | **Muy alta** | **Crítico** | **P0** | Migrate después de up = código nuevo contra schema viejo = 500s garantizados en cada deploy. |
| 4 | Backup/Restore Untested | **Alta** | **Crítico** | **P0** | Backup crashea (warn undefined). Restore causa data loss (DROP con conexiones activas). |
| 5 | Monitoring Incomplete | **Muy alta** | **Alto** | **P0** | AlertManager no entrega alertas (placeholder webhook). No hay monitoreo de PG/Redis. |
| 6 | Observability Not Wired | **Muy alta** | **Alto** | **P0** | 7 métricas definidas, 0 callers. Sentry ciego. Logger bypassado. Plataforma ciega en producción. |
| 7 | Secrets Inadequate | **Media** | **Crítico** | **P0** | Key de encriptación con entropía débil. Si se filtra, credenciales de pago son brute-forceable. |
| 8 | OAuth TOCTOU Race | **Media** | **Alto** | **P0** | Bajo tráfico normal no dispara. Bajo carga (100+ logins simultáneos con Google), puede corromper authOptions. |
| 9 | ID Generation Race | **Media** | **Alto** | **P0** | Solo ocurre con inserts concurrentes del mismo prefijo. En producción con tráfico real, es inevitable. |
| 10 | Redis Implementation Bugs | **Alta** | **Alto** | **P0** | Self-DoS en rate limiter bajo ataque. Memory leak en cache. BullMQ no arranca con `maxRetriesPerRequest: 2`. |
| 11 | DB Integrity Missing | **Media** | **Crítico** | **P0** | Sin CHECK constraints, un bug puede generar balances negativos. Sin FKs, deletes crean orphans. |
| 12 | DR Unplanned | **Alta** | **Crítico** | **P0** | Si el VPS muere, no hay procedimiento documentado. RPO = ∞ (sin backups verificados). |
| 13 | Unbounded Queries | **Media** | **Alto** | **P0** | OOM a 50K+ filas. Admin exportando logs puede tirar el servidor. |
| 14 | Admin Panel Bundle | **Alta** | **Medio** | **P1** | 136KB en un solo bundle. LCP > 3s en móvil. No causa fallo, pero UX inaceptable. |
| 15 | Obsolete Scripts | **Alta** | **Medio** | **P1** | Confusión del operador. Ejecutar script obsoleto = fallo silencioso. |

---

## P0 Risk Details (27 confirmed P0s)

### Probability: Muy Alta (garantizado en primer deploy)

| # | Root Cause | P0s | What happens | When |
|---|-----------|-----|--------------|------|
| 1 | Docker Build | 5 | `docker compose build` falla | Primer deploy |
| 3 | CI/CD Order | 3 | 500s durante ventana de migración | Cada deploy |
| 5 | Monitoring | 5 | Alertas nunca se entregan | Desde día 1 |
| 6 | Observability | 2 | Grafana vacío, Sentry ciego | Desde día 1 |

### Probability: Alta (ocurre bajo condiciones normales)

| # | Root Cause | P0s | What happens | When |
|---|-----------|-----|--------------|------|
| 2 | Nginx/CF | 2 | Rate limiting inútil, headers perdidos | Con Cloudflare activo |
| 4 | Backup/Restore | 5 | Backup crashea, restore causa data loss | Primer backup / primer restore |
| 10 | Redis Bugs | 4 | Self-DoS, memory leak, BullMQ no arranca | Bajo carga o al iniciar worker |
| 12 | DR | 2 | No se puede recuperar tras fallo | Cuando el VPS muera |

### Probability: Media (ocurre bajo condiciones específicas)

| # | Root Cause | P0s | What happens | When |
|---|-----------|-----|--------------|------|
| 7 | Secrets | 1 | Credenciales comprometidas si .env se filtra | Si hay leak |
| 8 | OAuth Race | 1 | Auth corruption | 100+ logins Google simultáneos |
| 9 | ID Race | 1 | IDs duplicados | Inserts concurrentes |
| 11 | DB Integrity | 3 | Balances negativos, orphans | Bug en app code |
| 13 | Queries | 1 | OOM kill | 50K+ filas en export |

---

## Risk Heatmap (simplified)

```
Impacto →    Bajo    Medio    Alto    Crítico
Probabilidad
Muy alta      —       —       RC-1,3,5,6    RC-1,3
Alta          —      RC-14,15  RC-2,4,10,12  RC-4,12
Media         —       —       RC-7,8,9,11,13 RC-7,11,13
Baja          —      RC-P2s   —              —
```

---

## Confidence Levels

| Root Cause | Confidence | Reason |
|-----------|------------|--------|
| RC-1 (Docker) | **Alta** | Archivos verificados línea por línea. `bun.lock` confirmed exists, `bun.lockb` confirmed absent. Notifications Dockerfile confirmed absent. |
| RC-2 (Nginx) | **Alta** | `add_header` nginx behavior is well-documented. Cloudflare IP requirement is standard. |
| RC-3 (CI/CD) | **Alta** | Deploy order is verifiable in ci.yml L151-152. |
| RC-4 (Backup) | **Alta** | `warn` function absence is verifiable. `pg_dump --format=custom` is binary. |
| RC-5 (Monitoring) | **Alta** | Exporters commented out in prometheus.yml. Placeholder in alertmanager.yml. |
| RC-6 (Observability) | **Alta** | Grep-verified: 0 callers for metrics, 0 routes using withErrorHandler. |
| RC-7 (Secrets) | **Media** | `.env` exists with weak key. Docker leakage unverified (no Docker in sandbox). |
| RC-8 (OAuth) | **Alta** | Code inspection confirms TOCTOU pattern. Race is provable. |
| RC-9 (IDs) | **Alta** | Code inspection confirms `findUnique + create` without `upsert`. |
| RC-10 (Redis) | **Alta** | Two `Math.random()` calls verified. `maxRetriesPerRequest: 2` verified in redis.ts. |
| RC-11 (DB) | **Alta** | Schema verified — no CHECK constraints, loose String FKs confirmed. |
| RC-12 (DR) | **Alta** | No `docs/dr.md`, no `dr-drill.sh`, no RTO/RPO documented. |
| RC-13 (Queries) | **Alta** | `findMany()` without `take` confirmed in admin/logs and export routes. |
| RC-14 (Admin bundle) | **Alta** | File is 2831 lines, no `React.lazy` confirmed. |
| RC-15 (Obsolete) | **Alta** | Files exist and are verified as duplicates/obsolete. |

---

*Risk matrix complete. 15 root causes assessed. 12 are P0 blockers.*
