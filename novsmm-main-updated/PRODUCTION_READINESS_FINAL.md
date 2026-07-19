# PRODUCTION_READINESS_FINAL.md
# NOVSMM — Production Readiness Final Report

**Fecha:** 2026-07-06
**Autor:** Principal Staff Engineer (External)
**Entorno de revisión:** Sandbox cloud (sin Docker, sin PostgreSQL, sin Redis)
**Veredicto:** ❌ **NO LISTO PARA PRODUCCIÓN** — 19 problemas bloqueantes requieren corrección antes del despliegue

---

## 1. ESTADO REAL DEL REPOSITORIO

### Lo que SÍ está hecho y verificado en sandbox

| Componente | Estado | Evidencia |
|-----------|--------|-----------|
| Código de aplicación | ✅ Funcional | `bun run lint` pasa (0 errores), dev server responde HTTP 200 |
| Schema Prisma (SQLite) | ✅ Funcional | `bun run db:push` exitoso, 32 modelos, DB con datos (5 usuarios, 57 órdenes, 6382 servicios) |
| APIs (71 rutas) | ✅ Funcional | 30/30 pruebas sandbox pasaron (login, dashboard, orders, wallet, etc.) |
| Google OAuth | ✅ Funcional | Redirige a accounts.google.com con Client ID correcto |
| Webhooks fail-closed | ✅ Funcional | Stripe/MP/NowPayments retornan 401 sin secret |
| CSRF protection | ✅ Funcional | 403 sin Origin, 403 con Origin malicioso |
| Health endpoints | ✅ Funcional | /api/health/live, /ready, /db responden 200 |
| Prometheus metrics | ✅ Funcional | /api/metrics retorna formato Prometheus |
| Lint | ✅ Limpio | 0 errores, 1 warning pre-existing |

### Lo que NO está verificado (requiere VPS real)

| Componente | Por qué no se puede verificar |
|-----------|-------------------------------|
| Docker build | Docker no instalado en sandbox |
| docker compose up | Docker no instalado |
| PostgreSQL real | No instalado (SQLite en sandbox) |
| Redis real | No instalado (in-memory fallback en sandbox) |
| Nginx + TLS | No instalado |
| SSL/TLS | No instalado |
| BullMQ worker real | Sin Redis real |
| WebSocket real | Sin Docker/Redis |
| Pruebas de carga | k6 no instalado |
| CI/CD pipeline | Sin GitHub Actions runner |

---

## 2. LISTA DE PROBLEMAS RESTANTES

### P0 — Bloqueantes para despliegue (19 problemas)

| # | Componente | Problema | Archivo | ¿Corregible en sandbox? |
|---|-----------|---------|---------|------------------------|
| P0-1 | Nginx | Sin `set_real_ip_from` para Cloudflare — rate limiting inútil | nginx.conf | ✅ Sí |
| P0-2 | Nginx | `add_header Cache-Control` en locations estáticas elimina HSTS y security headers | nginx.conf | ✅ Sí |
| P0-3 | CI/CD | `docker compose up` ejecuta ANTES de `prisma migrate deploy` — schema mismatch | .github/workflows/ci.yml | ✅ Sí |
| P0-4 | CI/CD | No hay health check post-deploy — deploys rotos silenciosos | .github/workflows/ci.yml | ✅ Sí |
| P0-5 | CI/CD | No hay estrategia de rollback | .github/workflows/ci.yml | ✅ Sí |
| P0-6 | backup.sh | Función `warn()` llamada pero no definida — script crashea | scripts/backup.sh:70 | ✅ Sí |
| P0-7 | backup.sh | `grep "CREATE TABLE"` sobre binary pg_dump — verificación inútil | scripts/backup.sh:65 | ✅ Sí |
| P0-8 | restore.sh | `DROP DATABASE` sin `pg_terminate_backend` — falla con conexiones activas | scripts/restore.sh:106 | ✅ Sí |
| P0-9 | Monitoring | Prometheus exporters (PG, Redis) comentados — sin monitoreo directo | monitoring/prometheus.yml | ✅ Sí |
| P0-10 | Monitoring | Faltan alertas: PostgresDown, RedisDown, BackupFailure | monitoring/alerts.yml | ✅ Sí |
| P0-11 | Monitoring | AlertManager webhook es placeholder — alertas no se entregan | monitoring/alertmanager.yml | ✅ Sí |
| P0-12 | DB | `nextPublicId` race condition — `findUnique + create` sin `upsert` | src/lib/ids.ts | ✅ Sí |
| P0-13 | Redis | `redisSlidingWindow` usa dos `Math.random()` diferentes — self-DoS | src/lib/rate-limit.ts | ✅ Sí |
| P0-14 | Redis | `maxRetriesPerRequest: 2` — BullMQ requiere `null` | src/lib/redis.ts | ✅ Sí |
| P0-15 | DB | Sin CHECK constraints — `balance = -9999` es válido | prisma/schema.prisma | ✅ Sí |
| P0-16 | Performance | `/api/admin/logs` y `/api/export` sin `take` — OOM a escala | src/app/api/admin/logs/route.ts, src/app/api/export/route.ts | ✅ Sí |
| P0-17 | Observability | 7 métricas Prometheus definidas, 0 callers — Grafana vacío | src/lib/metrics.ts + 71 routes | ✅ Sí |
| P0-18 | Observability | `/api/health/ready` calcula memory check pero no lo usa para 503 | src/app/api/health/ready/route.ts | ✅ Sí |
| P0-19 | .env | Faltan `REDIS_PASSWORD` y `POSTGRES_PASSWORD` en .env actual | .env | ✅ Sí |

### P1 — Importantes pero no bloqueantes (12 problemas)

| # | Componente | Problema | Archivo | ¿Corregible en sandbox? |
|---|-----------|---------|---------|------------------------|
| P1-1 | Scripts | Scripts obsoletos no eliminados (backup-db.sh, restore-db.sh, etc.) | scripts/ | ✅ Sí |
| P1-2 | Scripts | `python3` usado en 7 scripts sin fallback a `jq` | scripts/*.sh | ✅ Sí |
| P1-3 | Scripts | `--max-time` faltante en ~30 curl calls | scripts/*.sh | ✅ Sí |
| P1-4 | Scripts | `smoke-test.sh` y `validate-postgres-redis.sh` no exit 1 en fallo | scripts/*.sh | ✅ Sí |
| P1-5 | Nginx | `server_name novsmm.com` hardcoded — debe ser configurable | nginx.conf | ✅ Sí |
| P1-6 | CI/CD | `tsc --noEmit \|\| true` — typecheck no bloqueante | .github/workflows/ci.yml | ✅ Sí |
| P1-7 | CI/CD | Sin security scanning (CodeQL/Trivy) | .github/workflows/ci.yml | ✅ Sí |
| P1-8 | next.config | Falta `optimizePackageImports` (lucide, recharts, framer-motion) | next.config.ts | ✅ Sí |
| P1-9 | Docker | Sin resource limits (mem_limit, cpus) en compose | docker-compose.yml | ✅ Sí |
| P1-10 | Docker | Sin `cap_drop: ALL` ni `security_opt` | docker-compose.yml | ✅ Sí |
| P1-11 | Docker | Sin log rotation en Docker logging config | docker-compose.yml | ✅ Sí |
| P1-12 | DB | `PaymentIntent.providerIntentId` no es `@unique` — duplicate credits | prisma/schema.prisma | ✅ Sí |

---

## 3. RIESGOS ANTES DEL DESPLIEGUE

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| `docker compose build` falla | Alta | Crítico | Sin Docker en sandbox, no se puede validar. Sprint 1.1 aplicó fixes pero NO validados. |
| Nginx rate limiting inútil con Cloudflare | Alta | Alto | P0-1: Sin `set_real_ip_from`, todos los IPs son de CF. |
| Security headers perdidos en assets estáticos | Alta | Medio | P0-2: `add_header` en location blocks elimina headers del server block. |
| Deploy con schema mismatch | Alta | Crítico | P0-3: CI/CD hace `up` antes de `migrate`. Código nuevo contra schema viejo = 500s. |
| Backup crashea en primer intento | Alta | Crítico | P0-6: `warn()` no definida. `set -e` mata el script. |
| Restore causa data loss | Media | Crítico | P0-8: `DROP DATABASE` falla con conexiones activas, aborta después de dropear. |
| Métricas Prometheus vacías | Alta | Medio | P0-17: 7 métricas definidas, 0 callers. Grafana muestra "no data". |
| Race condition en IDs | Media | Alto | P0-12: `findUnique + create` sin `upsert`. Inserts concurrentes fallan. |
| Self-DoS en rate limiter | Media | Alto | P0-13: Requests rechazados quedan en sorted set, bloquean usuarios legítimos. |
| BullMQ worker no arranca | Alta | Crítico | P0-14: `maxRetriesPerRequest: 2` hace que BullMQ tire error en startup. |
| OOM en exports CSV | Media | Alto | P0-16: `findMany()` sin `take` carga todas las filas en memoria. |
| Alertas nunca se entregan | Alta | Alto | P0-11: AlertManager tiene placeholder webhook. |

---

## 4. CAMBIOS APLICADOS (Sprint 1.1 — Docker únicamente)

| Cambio | Archivo | Estado |
|--------|---------|--------|
| `bun.lockb*` → `bun.lock*` | Dockerfile | ✅ Aplicado (no validado con Docker real) |
| Instalar `curl` + `ca-certificates` | Dockerfile | ✅ Aplicado (no validado) |
| `mkdir /app/uploads && chown` | Dockerfile | ✅ Aplicado (no validado) |
| Eliminar `|| true` en build mini-service | Dockerfile | ✅ Aplicado |
| Crear notifications-service/Dockerfile | mini-services/notifications-service/Dockerfile | ✅ Aplicado (no validado) |
| Worker healthcheck override | docker-compose.yml | ✅ Aplicado (no validado) |
| `init: true` en 6 servicios | docker-compose.yml | ✅ Aplicado (no validado) |
| Redis `--requirepass` | docker-compose.yml | ✅ Aplicado (no validado) |
| REDIS_URL con password en 3 servicios | docker-compose.yml | ✅ Aplicado (no validado) |
| Remover puertos PG/Redis expuestos | docker-compose.yml | ✅ Aplicado (no validado) |
| Pin image tags (monitoring) | docker-compose.monitoring.yml | ✅ Aplicado (no validado) |
| Grafana password obligatoria | docker-compose.monitoring.yml | ✅ Aplicado (no validado) |
| `worker:prod` sin `--hot` | package.json | ✅ Aplicado |
| `REDIS_PASSWORD` en .env.example | .env.example | ✅ Aplicado |

**⚠️ NINGÚN cambio de Sprint 1.1 ha sido validado contra Docker real.**

---

## 5. CAMBIOS PENDIENTES

### Pendientes que SÍ se pueden corregir en sandbox (19 P0s)

Todos los 19 P0s restantes son corregibles en el sandbox sin necesidad de Docker/PG/Redis:

1. **nginx.conf** — 2 fixes (set_real_ip_from + add_header include)
2. **ci.yml** — 3 fixes (deploy order + health check + rollback)
3. **backup.sh** — 2 fixes (warn function + pg_restore --list)
4. **restore.sh** — 1 fix (pg_terminate_backend)
5. **monitoring/*.yml** — 3 fixes (exporters + alerts + webhook)
6. **ids.ts** — 1 fix (upsert)
7. **rate-limit.ts** — 1 fix (memberId capture)
8. **redis.ts** — 1 fix (maxRetriesPerRequest: null)
9. **schema.prisma** — 1 fix (CHECK constraints via raw SQL)
10. **admin/logs + export** — 1 fix (streaming + take limit)
11. **metrics.ts + routes** — 1 fix (wire callers)
12. **health/ready** — 1 fix (memory check gating)
13. **.env** — 1 fix (add REDIS_PASSWORD + POSTGRES_PASSWORD)

### Pendientes que requieren VPS real

| Cambio | Por qué requiere VPS |
|--------|---------------------|
| Validar `docker compose build` | Necesita Docker daemon |
| Validar `docker compose up` | Necesita Docker daemon |
| Validar PostgreSQL migraciones | Necesita PostgreSQL real |
| Validar Redis con password | Necesita Redis real |
| Validar BullMQ worker | Necesita Redis real |
| Validar WebSocket | Necesita Docker + Redis |
| Validar SSL/TLS | Necesita dominio + certbot |
| Validar Nginx proxy | Necesita Docker + nginx |
| Pruebas de carga k6 | Necesita k6 instalado |
| DR drill (backup + restore) | Necesita PostgreSQL real |

---

## 6. CHECKLIST DEFINITIVO PARA EL VPS

### Pre-Deploy (en VPS antes de cualquier comando)

```
□ 1.  SSH al VPS
□ 2.  apt update && apt upgrade -y
□ 3.  curl -fsSL https://get.docker.com | sh
□ 4.  systemctl enable docker && systemctl start docker
□ 5.  apt install docker-compose-plugin
□ 6.  git clone <repo> /opt/novsmm && cd /opt/novsmm
□ 7.  cp .env.example .env
□ 8.  Generar secrets:
       openssl rand -hex 32  # → NEXTAUTH_SECRET
       openssl rand -hex 24  # → LICENSE_ENCRYPTION_KEY
       openssl rand -hex 24  # → NOTIFICATIONS_SERVICE_SECRET
       openssl rand -hex 16  # → POSTGRES_PASSWORD
       openssl rand -hex 16  # → REDIS_PASSWORD
□ 9.  nano .env  # Llenar TODAS las variables
□ 10. Verificar que prisma/schema.prisma sea el esquema canónico PostgreSQL
□ 11. ./scripts/pre-deploy-check.sh  # 0 FAIL
```

### Deploy

```
□ 12. docker compose build 2>&1 | tee build.log
       # Verificar: "Successfully tagged" al final
       # Si falla: revisar build.log, NO continuar
□ 13. docker compose up -d
□ 14. docker compose ps  # Todos "running" + "healthy"
       # Esperar hasta 3 minutos para que todos estén healthy
□ 15. docker compose exec web bun run prisma migrate deploy
       # Verificar: "Applied N migrations"
□ 16. docker compose exec web bun run prisma/seed.ts
       # ANOTAR el password de admin generado
□ 17. Si migras desde SQLite:
       SQLITE_DATABASE_URL="file:./db/custom.db" \
       docker compose exec -e SQLITE_DATABASE_URL="file:./db/custom.db" \
       web bun run prisma/migrate-sqlite-to-postgres.ts
```

### Validación Post-Deploy

```
□ 18. ./scripts/validate-postgres-redis.sh  # 0 FAIL
□ 19. ./scripts/smoke-test.sh http://localhost  # 0 FAIL
□ 20. curl http://localhost:3000/api/health/ready | python3 -m json.tool
       # database.connected: true, database.provider: postgresql
       # redis.healthy: true
□ 21. docker compose exec postgres psql -U novsmm -d novsmm \
       -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
       # Debe ser 30+
□ 22. docker compose exec redis redis-cli -a $REDIS_PASSWORD ping
       # Debe responder PONG
□ 23. docker compose logs web | tail -20  # Sin errores
□ 24. docker compose logs worker | tail -20  # "workers running"
□ 25. docker compose logs notifications | tail -10  # "server running on port 3003"
```

### SSL + DNS

```
□ 26. sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com
□ 27. mkdir -p certs
       sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem certs/
       sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem certs/
□ 28. docker compose restart nginx
□ 29. curl -I https://tudominio.com  # HTTP 200 o 302
□ 30. Configurar DNS A record → IP del VPS
□ 31. Configurar Cloudflare: SSL/TLS Full (strict)
□ 32. echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/tudominio.com/*.pem /opt/novsmm/certs/ && docker compose -f /opt/novsmm/docker-compose.yml restart nginx" | crontab -
```

### Google OAuth

```
□ 33. Google Cloud Console → Credentials → OAuth 2.0 Client ID
       Authorized redirect URIs:
       https://tudominio.com/api/auth/callback/google
□ 34. En NOVSMM admin → Social Auth → Guardar Google credentials
□ 35. Probar login con Google → redirige a accounts.google.com → callback → dashboard
```

### Webhooks de Pago

```
□ 36. Stripe Dashboard → Webhooks → Add endpoint:
       https://tudominio.com/api/webhooks/stripe
       Events: payment_intent.*, charge.refunded, checkout.session.*, customer.subscription.*, invoice.*
       Copiar signing secret → STRIPE_WEBHOOK_SECRET en .env
□ 37. Mercado Pago → Webhooks:
       https://tudominio.com/api/webhooks/mercadopago
       Copiar secret → MP_WEBHOOK_SECRET en .env
□ 38. NowPayments → IPN:
       https://tudominio.com/api/webhooks/nowpayments
       Copiar IPN secret → NOWPAYMENTS_IPN_SECRET en .env
□ 39. docker compose restart web worker
```

### Backups

```
□ 40. mkdir -p /backups
□ 41. ./scripts/backup.sh  # Verificar que completa sin errores
□ 42. ls -la /backups/  # Backup file existe
□ 43. crontab -e:
       0 2 * * * /opt/novsmm/scripts/backup.sh >> /var/log/novsmm-backup.log 2>&1
       */5 * * * * /opt/novsmm/scripts/healthcheck.sh >> /var/log/novsmm-health.log 2>&1
```

### Monitoreo

```
□ 44. GRAFANA_USER=admin GRAFANA_PASSWORD=tu_password_strong \
       ./scripts/monitor-setup.sh
□ 45. Abrir Grafana en http://localhost:3001
□ 46. Import → Dashboard ID 1860 (Node Exporter)
□ 47. Configurar alertmanager.yml con webhook de Slack real
□ 48. docker compose -f docker-compose.yml -f docker-compose.monitoring.yml restart alertmanager
```

### Go-Live Final

```
□ 49. ./scripts/pre-deploy-check.sh  # 0 FAIL
□ 50. ./scripts/validate-postgres-redis.sh  # 0 FAIL
□ 51. ./scripts/smoke-test.sh https://tudominio.com  # 0 FAIL
□ 52. ./scripts/healthcheck.sh  # 0 FAIL
□ 53. Login real funciona
□ 54. Orden real funciona
□ 55. Pago real funciona (monto mínimo)
□ 56. 30 min de monitoreo sin errores 5xx
```

---

## 7. COMANDOS EXACTOS PARA CERTIFICAR EL PROYECTO EN EL VPS

```bash
# ═══════════════════════════════════════════════════════════════
# NOVSMM — COMANDOS DE CERTIFICACIÓN EN VPS REAL
# Ejecutar en orden. No saltar pasos.
# ═══════════════════════════════════════════════════════════════

# ── 1. PREPARACIÓN ──
ssh root@TU_VPS_IP
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
apt install -y docker-compose-plugin git

# ── 2. CLONAR Y CONFIGURAR ──
git clone https://github.com/tuusuario/novsmm.git /opt/novsmm
cd /opt/novsmm
cp .env.example .env

# Generar TODOS los secrets
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)"
echo "LICENSE_ENCRYPTION_KEY=$(openssl rand -hex 24)"
echo "NOTIFICATIONS_SERVICE_SECRET=$(openssl rand -hex 24)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
echo "REDIS_PASSWORD=$(openssl rand -hex 16)"
echo "GRAFANA_USER=admin"
echo "GRAFANA_PASSWORD=$(openssl rand -hex 12)"

# Pegar TODOS los valores en .env
nano .env

# Cambiar a schema PostgreSQL
# prisma/schema.prisma ya es el esquema canónico PostgreSQL; no copiar la
# referencia heredada schema.postgres.prisma sobre el esquema activo.

# ── 3. PRE-DEPLOY CHECK ──
./scripts/pre-deploy-check.sh
# Si hay FAIL: NO continuar. Corregir primero.

# ── 4. BUILD ──
docker compose build 2>&1 | tee /tmp/build.log
# Verificar: últimas líneas dicen "Successfully" o "naming to"
# Si falla: tail -100 /tmp/build.log para ver errores

# ── 5. ARRANQUE ──
docker compose up -d
# Esperar 3 minutos
docker compose ps
# Todos deben decir "running" y "healthy"
# Si alguno dice "unhealthy": docker compose logs <servicio>

# ── 6. BASE DE DATOS ──
docker compose exec web bun run prisma migrate deploy
# Debe decir "Applied N migrations" sin errores

docker compose exec web bun run prisma/seed.ts
# ANOTAR el password de admin

# ── 7. VALIDACIÓN DE CONEXIONES ──
./scripts/validate-postgres-redis.sh
# Debe terminar con "✅ TODOS LOS SERVICIOS ESTÁN OPERATIVOS"

# ── 8. SMOKE TEST ──
./scripts/smoke-test.sh http://localhost
# Debe terminar con "✅ SMOKE TEST APROBADO"

# ── 9. VERIFICACIÓN MANUAL ──
# PostgreSQL
docker compose exec postgres psql -U novsmm -d novsmm \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# Debe ser 30+

docker compose exec postgres psql -U novsmm -d novsmm \
  -c "SELECT count(*) FROM users;"
# Debe ser > 0

docker compose exec postgres psql -U novsmm -d novsmm \
  -c "SELECT count(*) FROM services;"
# Debe ser 6000+

# Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping
# Debe responder PONG

docker compose exec redis redis-cli -a $REDIS_PASSWORD SET novsmm:test "ok"
docker compose exec redis redis-cli -a $REDIS_PASSWORD GET novsmm:test
# Debe responder "ok"
docker compose exec redis redis-cli -a $REDIS_PASSWORD DEL novsmm:test

# Health endpoints
curl -s http://localhost:3000/api/health/live | python3 -m json.tool
curl -s http://localhost:3000/api/health/ready | python3 -m json.tool
curl -s http://localhost:3000/api/health/db | python3 -m json.tool
curl -s http://localhost:3000/api/metrics | head -5

# Logs sin errores
docker compose logs web 2>&1 | grep -iE "error|fail|crash" | tail -5
docker compose logs worker 2>&1 | grep -iE "error|fail|crash" | tail -5
docker compose logs notifications 2>&1 | grep -iE "error|fail|crash" | tail -5

# ── 10. SSL ──
docker compose stop nginx
certbot certonly --standalone -d tudominio.com -d www.tudominio.com
mkdir -p certs
cp /etc/letsencrypt/live/tudominio.com/fullchain.pem certs/
cp /etc/letsencrypt/live/tudominio.com/privkey.pem certs/
docker compose start nginx
curl -I https://tudominio.com

# ── 11. BACKUP TEST ──
./scripts/backup.sh
ls -la /backups/
# Debe existir novsmm_db_*.sql.gz

# ── 12. HEALTHCHECK ──
./scripts/healthcheck.sh
# Debe terminar con "✅ All systems operational"

# ── CERTIFICACIÓN ──
# Si TODOS los pasos anteriores pasaron sin errores:
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM CERTIFICADO PARA PRODUCCIÓN                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
```

---

## 8. DECLARACIÓN FINAL

**Yo, actuando como Principal Staff Engineer, declaro que:**

1. **El repositorio NO está certificado para producción.** Hay 19 P0s sin resolver.

2. **Los cambios de Sprint 1.1 (Docker) NO están validados.** No hay Docker en el sandbox. Los cambios son sintácticamente correctos pero no probados contra Docker real.

3. **Los 19 P0s restantes son corregibles en el sandbox.** No requieren Docker/PG/Redis para aplicar el fix. Solo requieren VPS para VALIDAR.

4. **La aplicación funciona en sandbox** (SQLite + in-memory Redis fallback). 30/30 pruebas sandbox pasaron. Pero esto NO garantiza que funcione en producción con PostgreSQL + Redis reales.

5. **El primer `docker compose build` en VPS puede fallar** por razones no detectables en el sandbox (ej: `oven/bun:1.1-slim` podría no tener `apt-get`, o `bun install --frozen-lockfile` podría comportarse diferente).

6. **Recomiendo:** Resolver los 19 P0s restantes en el sandbox ANTES de desplegar al VPS. Luego desplegar y ejecutar los comandos de certificación (sección 7). Si los comandos de certificación pasan, el proyecto está certificado.

---

*Reporte generado el 2026-07-06*
*19 P0s pendientes — PROYECTO NO CERTIFICADO*
