# NOVSMM — Deployment Readiness Report

**Auditor:** External SRE & Cloud Architect
**Fecha:** 2026-07-06
**Veredicto:** ❌ **NO LISTO PARA DESPLIEGUE** — 51 P0s sin resolver

---

## Estado de readiness por componente

| Componente | P0s | Estado | Bloquea deploy |
|------------|-----|--------|----------------|
| Dockerfile | 4 | ❌ Crítico | ✅ Sí |
| docker-compose.yml | 2 | ❌ Crítico | ✅ Sí |
| docker-compose.monitoring.yml | 2 | ❌ Crítico | ⚠️ Post-deploy |
| Nginx | 2 | ❌ Crítico | ✅ Sí |
| GitHub Actions CI/CD | 3 | ❌ Crítico | ⚠️ Post-deploy |
| PostgreSQL schema | 5 | ❌ Crítico | ✅ Sí |
| Redis config | 4 | ❌ Crítico | ✅ Sí |
| Scripts Bash | 8 | ❌ Crítico | ✅ Sí |
| Seguridad | 3 | ⚠️ Condicional | ✅ Sí |
| Performance | 4 | ❌ Crítico | ✅ Sí |
| Observabilidad | 0 | ⚠️ Mejorable | ❌ No bloquea |
| Disaster Recovery | 4 | ❌ Crítico | ⚠️ Post-deploy |

---

## Escenarios de fallo en producción (simulación mental)

### Escenario 1: Primer `docker compose up --build` en VPS
**Resultado:** ❌ FALLO
- `notifications` service no puede buildear (Dockerfile no existe)
- `web` container HEALTHCHECK falla (curl no instalado)
- `web` no puede escribir uploads (directorio no creado)
- Worker hereda HEALTHCHECK del web (sin HTTP server)

### Escenario 2: Redis se cae en producción
**Resultado:** ⚠️ DEGRADADO
- Cache → in-memory (per-instance, no shared)
- Rate limiter → in-memory (per-instance)
- Queues → setImmediate (in-process, se pierden en restart)
- Worker → EXIT (no puede conectar a Redis) → fallback a setImmediate
- JWT callback → DB hit en cada request (7× DB load multi-instance)
- Notificaciones WebSocket → single-instance (sin Redis adapter)

### Escenario 3: PostgreSQL se cae
**Resultado:** ❌ CATASTRÓFICO
- Todo 500 (requireAuth falla en cada request)
- Webhooks no pueden escribir WebhookLog → payment credits lost
- /api/health/ready → 503 (correcto)
- Sin circuit breaker → 10s hang por request
- Sin webhook replay → pagos perdidos permanentemente

### Escenario 4: Disco lleno
**Resultado:** ❌ CATASTRÓFICO
- Logs crecen indefinidamente (sin log rotation)
- PostgreSQL WAL halt
- Backups fallan silenciosamente (sin alerting)
- /api/health/ready retorna 200 (no verifica disco)

### Escenario 5: Deploy con migration nueva
**Resultado:** ❌ FALLO
- CI/CD: `docker compose up` → nuevos contenedores con código nuevo
- DESPUÉS: `prisma migrate deploy` → migración corre contra código ya corriendo
- Durante la ventana: código nuevo contra schema viejo → 500s, NOT-NULL violations

### Escenario 6: SSL cert vence
**Resultado:** ❌ FALLO
- nginx TLS handshake fails
- Auto-renovación en cron pero sin alerting si falla
- Sin cert-manager
- Sin TTL alert en Prometheus

### Escenario 7: Cloudflare cae
**Resultado:** ❌ CATASTRÓFICO
- Clientes no pueden acceder
- Webhooks de pago no llegan
- Sin webhook replay job → pagos perdidos
- Sin fallback DNS

### Escenario 8: Admin ejecuta `./scripts/backup.sh`
**Resultado:** ❌ FALLO
- Función `warn` no definida → script crashea
- `grep "CREATE TABLE"` sobre binary pg_dump → verificación retorna 0
- Backup "exitoso" pero no verificable

### Escenario 9: Admin ejecuta `./scripts/restore.sh`
**Resultado:** ❌ FALLO
- `DROP DATABASE` falla (conexiones activas)
- Restore aborta DESPUÉS de dropear DB → data loss total

### Escenario 10: Ataque CSRF con Origin spoofing
**Resultado:** ✅ BLOQUEADO
- Middleware hace value-matching contra NEXTAUTH_URL host
- Origin malicioso → 403 "origin mismatch"

---

## Matriz de confidence

| Área | Confidence | Razón |
|------|-----------|-------|
| Docker findings | Alta | Archivos leídos línea por línea, verificado contra filesystem |
| Nginx findings | Alta | Config review + nginx docs cross-check |
| PostgreSQL findings | Alta | Schema + code review |
| Redis findings | Alta | Code review + BullMQ docs |
| Security findings | Alta | Code review + grep-verified patterns |
| Bash findings | Alta | Line-by-line review |
| Performance findings | Alta | Code review + bundle analysis |
| Failure scenarios | Media-Alta | Razonados de code paths, sin load test real |

---

## Lo que NO se pudo verificar (sandbox limitations)

- ❌ Docker build real (Docker no instalado en sandbox)
- ❌ PostgreSQL conexión real (no instalado)
- ❌ Redis conexión real (no instalado)
- ❌ Nginx TLS real (no instalado)
- ❌ SSL/TLS con Let's Encrypt
- ❌ Cloudflare proxy
- ❌ Pruebas de carga con k6
- ❌ DR drill real
- ❌ Webhooks con firmas reales de Stripe/MP/NowPayments

**Estos items NO pueden ser marcados como aprobados hasta ser verificados en VPS real.**

---

## Acciones requeridas antes de go-live

### Bloqueantes (P0 — resolver antes de cualquier deploy)
1. Crear `mini-services/notifications-service/Dockerfile`
2. Fix `bun.lockb*` → `bun.lock*` en Dockerfile
3. Instalar `curl` en runner stage o usar bun-based healthcheck
4. Agregar `mkdir /app/uploads && chown nextjs` antes de `USER nextjs`
5. Agregar healthcheck override para worker
6. Agregar Redis `--requirepass` + password
7. Agregar `set_real_ip_from` para Cloudflare en nginx
8. Repetir security headers en cada nginx location (o usar include)
9. Revertir deploy order: migrate BEFORE docker compose up
10. Agregar post-deploy health check en CI/CD
11. Fix `nextPublicId` race condition (usar `upsert`)
12. Fix `redisSlidingWindow` member ID (capturar una vez)
13. Agregar cleanup interval en `memoryCache`
14. Agregar CHECK constraints en PostgreSQL
15. Fix `backup.sh` función `warn` + verificación de backup
16. Fix `restore.sh` DROP DATABASE con conexiones activas
17. Fix Grafana default password
18. Configurar alertmanager webhook real
19. Habilitar Prometheus exporters (postgres, redis)
20. Agregar alertas faltantes (PostgresDown, RedisDown, BackupFailure)
21. Fix `pre-deploy-check.sh` `df -g` → `df` en Linux
22. Rotar TODOS los secrets
23. Fix TOCTOU race en Google OAuth provider
24. Stream CSV exports (OOM prevention)
25. Wire metrics/recordHttpRequest/recordCacheOp/recordQueueJob
26. Fix /api/health/ready memory check gating
27. Code-split admin-panel.tsx
28. Agregar webhook replay job
29. Fix `maxRetriesPerRequest: null` para BullMQ
30. Agregar `statement_timeout` en PostgreSQL connection
31. Agregar proper relations a Offer, Referral, LoyaltyPoint
32. Fix script de migración (split PrismaClient)
33. Fix `withRedis` error handling (distinguir connection vs command errors)
34. Agregar DLQ monitoring
35. Agregar 2FA rate limit
36. Validar backup codes en authorize()
37. Agregar Zod validation a social-auth POST
38. Agregar tokenVersion para invalidar JWTs
39-51. Ver reportes individuales para P0s restantes

### Importante (P1 — resolver en primera semana post-deploy)
- Reemplazar `console.error` con `logger` en 32 archivos
- Agregar `optimizePackageImports` en next.config
- Agregar log rotation en Docker
- Agregar webhook replay cron
- Agregar `session.maxAge` explícito
- Fix MP webhook timestamp freshness
- Agregar `/uploads/` auth
- Validar `link` como http/https only

---

## Conclusión

**NOVSMM NO está listo para despliegue en producción.**

Se encontraron **51 problemas críticos (P0)** que causarían fallos en:
- Build de Docker (Dockerfile + notifications service)
- Salud del contenedor (HEALTHCHECK incorrecto)
- Seguridad (Redis sin password, secrets con entropía débil)
- Integridad de datos (race conditions, no CHECK constraints)
- Observabilidad (métricas dead code, logger bypassed)
- Disaster recovery (backup script crashea, restore causa data loss)
- CI/CD (deploy order incorrecto, sin rollback)

**Tiempo estimado para resolver P0s:** 5-7 días ingeniero senior
**Re-auditoría requerida:** Sí, completa, después de fixes

---

*Reporte de readiness ejecutado el 2026-07-06*
*51 P0s encontrados — PROYECTO NO LISTO PARA DESPLIEGUE*
