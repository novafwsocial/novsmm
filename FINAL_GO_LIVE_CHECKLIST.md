# NOVSMM — Final Go-Live Checklist

**Auditor:** External DevOps Engineer, Cloud Architect, SRE, Security Auditor
**Fecha:** 2026-07-06
**Veredicto:** ❌ **GO-LIVE BLOQUEADO** — 51 P0s sin resolver

---

## ESTADO: ❌ BLOQUEADO

**NO se puede proceder con go-live hasta que TODOS los items siguientes estén resueltos.**

---

## P0s que BLOQUEAN Go-Live (deben estar ✅ antes de continuar)

### Docker (4 P0s)
- [ ] Fix `bun.lockb*` → `bun.lock*` en Dockerfile L14
- [ ] Instalar `curl` en `oven/bun:1.1-slim` o usar `bun -e "fetch(...)"`
- [ ] Agregar HEALTHCHECK override para worker (no HTTP server)
- [ ] Agregar `mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads` antes de `USER nextjs`

### Docker Compose (2 P0s)
- [ ] Crear `mini-services/notifications-service/Dockerfile` (NO EXISTE)
- [ ] Agregar `--requirepass ${REDIS_PASSWORD}` a Redis + actualizar `REDIS_URL`

### Nginx (2 P0s)
- [ ] Agregar `set_real_ip_from` para Cloudflare IP ranges
- [ ] Repetir security headers en cada location (o usar `include /etc/nginx/security.conf`)

### CI/CD (3 P0s)
- [ ] Revertir deploy order: `prisma migrate deploy` ANTES de `docker compose up -d`
- [ ] Agregar post-deploy health check (curl /api/health/ready, retry 5×)
- [ ] Agregar estrategia de rollback (docker compose rollback + migrate rollback)

### PostgreSQL (5 P0s)
- [ ] Fix `nextPublicId` race condition: reemplazar `findUnique + create` con `upsert`
- [ ] Agregar CHECK constraints: `balance >= 0`, `quantity > 0`, `price >= 0`
- [ ] Agregar proper relations a Offer, Referral, LoyaltyPoint, License.customerId
- [ ] Fix migration script: usar PrismaClient separados para origen y destino
- [ ] Agregar `statement_timeout=30s` en DATABASE_URL

### Redis (4 P0s)
- [ ] Fix `redisSlidingWindow`: capturar `memberId` una vez (no dos `Math.random()`)
- [ ] Agregar cleanup interval en `memoryCache` (`setInterval` + `unref()`)
- [ ] Fix `withRedis`: distinguir connection errors de command errors
- [ ] Fix `maxRetriesPerRequest: null` para BullMQ compatibility

### Scripts Bash (8 P0s)
- [ ] Fix `backup.sh`: definir función `warn` + usar `--format=plain` en pg_dump
- [ ] Fix `restore.sh`: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity` antes de DROP
- [ ] Fix `monitor-setup.sh`: requerir `GRAFANA_PASSWORD` (no default `admin`)
- [ ] Configurar alertmanager.yml con webhook real (no placeholder)
- [ ] Habilitar Prometheus exporters (postgres, redis) — descomentar en prometheus.yml
- [ ] Agregar alertas: `PostgresDown`, `RedisDown`, `BackupFailure`
- [ ] Fix `pre-deploy-check.sh`: reemplazar `df -g` con `df --output=avail -B1 /`
- [ ] Eliminar scripts duplicados (`backup-db.sh`, `restore-db.sh`)

### Seguridad (3 P0s)
- [ ] Rotar TODOS los secrets con `openssl rand -hex 32`
- [ ] Re-encriptar credenciales almacenadas con nueva `LICENSE_ENCRYPTION_KEY`
- [ ] Fix TOCTOU race en `ensureGoogleProvider` (Promise-singleton + dedup)

### Performance (4 P0s)
- [ ] Stream CSV exports con `ReadableStream` + cursor pagination
- [ ] Wire `recordHttpRequest`/`recordCacheOp`/`recordQueueJob` a código real
- [ ] Fix `/api/health/ready`: memory check debe gate 503
- [ ] Code-split `admin-panel.tsx` con `React.lazy` por tab

### Disaster Recovery (4 P0s)
- [ ] Agregar backup verification real (pg_restore a DB temporal + COUNT)
- [ ] Agregar backup failure alerting (cron + healthcheck)
- [ ] Documentar DR runbook con RTO/RPO
- [ ] Automatizar DR drill (script que provisiona VPS test + restore + verify)

### Observabilidad (4 P0s)
- [ ] Reemplazar `console.error` con `logger` en 32 archivos
- [ ] Wire `withErrorHandler` en API routes (o al menos en las críticas)
- [ ] Wire Sentry `captureException` en catch blocks
- [ ] Agregar log rotation en Docker (`max-size: 50m, max-file: 5`)

### Producción (8 P0s)
- [ ] Agregar circuit breaker para PostgreSQL (fail fast, no 10s hang)
- [ ] Agregar webhook replay job (cron que procesa WebhookLog status=failed)
- [ ] Agregar `init: true` en docker-compose (PID 1 zombie prevention)
- [ ] Agregar resource limits (mem_limit, cpus) en docker-compose
- [ ] Agregar `cap_drop: ALL` + `security_opt: no-new-privileges`
- [ ] Agregar Docker logging config (log rotation)
- [ ] Pin todas las imágenes Docker (sin `:latest`)
- [ ] Agregar 2FA rate limit (5 intentos / 30s + lockout)

---

## Después de resolver P0s (pre-go-live)

### Verificación en VPS real
- [ ] `./scripts/pre-deploy-check.sh` — 0 FAIL
- [ ] `./scripts/deploy.sh` — completa sin errores
- [ ] `./scripts/validate-postgres-redis.sh` — 0 FAIL
- [ ] `./scripts/smoke-test.sh https://tudominio.com` — 0 FAIL
- [ ] `./scripts/healthcheck.sh` — 0 FAIL
- [ ] `./scripts/backup.sh` — backup verificado
- [ ] `./scripts/restore.sh` — restore verificado en DB temporal

### SSL + DNS
- [ ] Certbot obtiene certificados
- [ ] HTTPS funciona con cert válido
- [ ] HTTP → HTTPS redirect
- [ ] DNS A record propaga
- [ ] Cloudflare Full (strict)

### Google OAuth
- [ ] Redirect URI en Google Console
- [ ] Credenciales guardadas en admin
- [ ] Login con Google funciona end-to-end

### Webhooks
- [ ] Stripe webhook + secret
- [ ] MP webhook + secret
- [ ] NowPayments IPN + secret
- [ ] Webhook replay job funcionando

### Pruebas de carga
- [ ] k6 test 100 VUs: p95 < 500ms
- [ ] k6 test 1000 VUs: p95 < 2s
- [ ] 0 race conditions
- [ ] 0 saldos negativos
- [ ] Worker sin cuello de botella

### Monitoreo
- [ ] Prometheus healthy
- [ ] Grafana healthy
- [ ] AlertManager con webhook real
- [ ] Todas las alertas activas (NovsmmDown, HighErrorRate, PostgresDown, RedisDown, DiskFull, BackupFailure)
- [ ] Sentry capturando errores
- [ ] Healthcheck cron cada 5 min

### Backups
- [ ] Cron backup nightly 2 AM
- [ ] Backup verification pasa
- [ ] Restore probado en VPS test
- [ ] DR drill documentado

### Go-Live Final
- [ ] TODOS los P0s resueltos
- [ ] Re-auditoría completada (0 P0s)
- [ ] Login real funciona
- [ ] Orden real funciona
- [ ] Pago real funciona (monto mínimo)
- [ ] 30 min de monitoreo sin errores
- [ ] 0 errores 5xx en logs

---

## Firma de certificación

**El proyecto NOVSMM NO puede ser certificado para producción en su estado actual.**

Se encontraron **51 problemas críticos (P0)** que causarían:
- Fallos de build de Docker
- Fallos de healthcheck
- Race conditions en creación de órdenes
- Pérdida de datos en restore
- Self-DoS en rate limiting
- Memory leaks
- Métricas dead code (plataforma ciega)
- Security headers faltantes en assets estáticos
- CI/CD con deploy order incorrecto
- Backups no verificables

**Requisito para certificación:**
1. Resolver TODOS los 51 P0s
2. Re-auditoría completa (nueva auditoría línea por línea)
3. Pruebas en VPS real con Docker + PostgreSQL + Redis
4. Pruebas de carga con k6 (100+ VUs)
5. DR drill exitoso

**Solo después de todo lo anterior: GO LIVE.**

---

*Checklist final ejecutado el 2026-07-06*
*51 P0s bloqueantes — GO-LIVE BLOQUEADO*
*Próxima auditoría: después de resolver P0s*
