# NOVSMM — Reporte de Validación en Entorno Real

**Fecha:** 2026-07-06
**Estado:** PENDIENTE DE EJECUCIÓN EN VPS REAL
**Entorno actual:** Sandbox cloud (sin PostgreSQL, Redis, ni Docker)

---

## ⚠️ DECLARACIÓN DE HONESTIDAD

**No puedo ejecutar las pruebas en un entorno real desde este sandbox.** Este entorno tiene las siguientes limitaciones:

| Componente | Estado en Sandbox | Estado Requerido para VPS |
|-----------|-------------------|--------------------------|
| PostgreSQL | ❌ No instalado | ✅ Docker container |
| Redis | ❌ No instalado | ✅ Docker container |
| Docker | ❌ No instalado | ✅ Instalado |
| Docker Compose | ❌ No instalado | ✅ Instalado |
| Nginx | ❌ No instalado | ✅ Docker container |
| Dominio real | ❌ No disponible | ✅ Configurado |
| SSL/TLS | ❌ No disponible | ✅ Let's Encrypt |

**Lo que SÍ he hecho:**
1. ✅ Creado 4 scripts de validación automatizada para ejecutar en tu VPS
2. ✅ Creado script de pruebas de carga (k6)
3. ✅ Verificado que el código funciona en sandbox (30/30 pruebas pasaron)
4. ✅ Verificado que los archivos de configuración son correctos (Dockerfile, docker-compose, nginx.conf)
5. ✅ Verificado que las variables de entorno están documentadas (.env.example)

---

## KIT DE VALIDACIÓN PARA VPS

He creado 4 scripts que debes ejecutar en tu VPS en este orden:

### Script 1: Pre-Deploy Check (antes de deployar)

**Verifica que el VPS esté listo:**
- Docker instalado y activo
- Docker Compose v2 disponible
- Imágenes Docker descargables (postgres, redis, nginx)
- Puertos disponibles (80, 443, 3000, 5432, 6379)
- RAM suficiente (4GB+)
- Disco suficiente (20GB+)
- Firewall configurado
- Variables de entorno en .env
- Schema PostgreSQL activo

```bash
# En tu VPS:
chmod +x scripts/pre-deploy-check.sh
./scripts/pre-deploy-check.sh
```

### Script 2: Docker Compose Up (deployar)

```bash
# Deployar todos los servicios
docker compose up -d --build

# Verificar que todos están corriendo
docker compose ps
```

### Script 3: Post-Deploy Validation (después de deployar)

**Verifica que todos los servicios estén conectados:**
- PostgreSQL responde (pg_isready + SELECT 1)
- PostgreSQL tiene todas las tablas (30+)
- PostgreSQL tiene datos (users, services, orders)
- Redis responde (PING → PONG)
- Redis SET/GET funciona
- App web conectada a PostgreSQL
- App web conectada a Redis
- Nginx redirige HTTP → HTTPS
- Nginx sirve HTTPS
- Worker está activo
- Notifications service responde /healthz
- Variables de entorno cargadas en contenedores

```bash
# Después de docker compose up:
chmod +x scripts/validate-postgres-redis.sh
./scripts/validate-postgres-redis.sh
```

### Script 4: Smoke Test (pruebas funcionales)

**Verifica que las APIs funcionen end-to-end:**
- Health endpoints (live, ready)
- APIs públicas (settings, status, payment-methods, services)
- Seguridad (CSRF, webhooks fail-closed)
- Auth (session, providers, Google OAuth)
- Prometheus metrics
- Login + APIs autenticadas (dashboard, orders, wallet, notifications)

```bash
# Después de la validación:
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh https://tudominio.com
```

### Script 5: Load Test (pruebas de carga)

**Verifica que no haya cuellos de botella:**

```bash
# Instalar k6
sudo apt install k6
# o: sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt update && sudo apt install k6

# Test 1: Carga normal (100 usuarios, 5 minutos)
k6 run --env BASE_URL=https://tudominio.com scripts/load-test.js

# Test 2: Carga pico (1000 usuarios)
k6 run --env BASE_URL=https://tudominio.com --env VUS=1000 scripts/load-test.js

# Test 3: Stress test de órdenes
k6 run --env BASE_URL=https://tudominio.com --env STRESS=true scripts/load-test.js
```

**Targets esperados:**
| Métrica | Target | Threshold |
|---------|--------|-----------|
| p95 latency | < 500ms | `http_req_duration:p(95)<500` |
| Error rate | < 1% | `errors:rate<0.01` |
| Login p95 | < 1000ms | — |
| Dashboard p95 | < 500ms | — |

---

## CHECKLIST DE VALIDACIÓN EN VPS REAL

### Fase 1: Pre-Deploy (en VPS antes de deployar)

```bash
# 1. SSH al VPS
ssh root@tu-vps-ip

# 2. Clonar repositorio
git clone https://github.com/tuusuario/novsmm.git /opt/novsmm
cd /opt/novsmm

# 3. Configurar .env
cp .env.example .env
nano .env  # Editar con valores reales

# 4. Cambiar a schema PostgreSQL
# prisma/schema.prisma ya es el esquema canónico PostgreSQL; no copiar la
# referencia heredada schema.postgres.prisma sobre el esquema activo.

# 5. Ejecutar pre-deploy check
./scripts/pre-deploy-check.sh
```

**Checklist:**
- [ ] Docker instalado y activo
- [ ] Docker Compose v2 disponible
- [ ] Puerto 80 disponible
- [ ] Puerto 443 disponible
- [ ] Puerto 3000 disponible
- [ ] Puerto 5432 disponible
- [ ] Puerto 6379 disponible
- [ ] RAM >= 4GB
- [ ] Disco >= 20GB
- [ ] .env configurado con todas las variables
- [ ] DATABASE_URL apunta a postgresql://
- [ ] REDIS_URL apunta a redis://redis:6379
- [ ] NEXTAUTH_SECRET generado
- [ ] LICENSE_ENCRYPTION_KEY generado
- [ ] POSTGRES_PASSWORD generado
- [ ] Schema activo usa PostgreSQL
- [ ] Firewall permite puertos 80, 443, 22

### Fase 2: Deploy (docker compose up)

```bash
# 1. Build y start
docker compose up -d --build

# 2. Esperar a que todos los servicios estén healthy
docker compose ps
# Todos deben decir "running" y "healthy"

# 3. Inicializar base de datos
docker compose exec web bun run prisma migrate deploy

# 4. Ejecutar seed (crear admin)
docker compose exec web bun run prisma/seed.ts
# ANOTAR el password generado

# 5. Si migras desde SQLite:
# SQLITE_DATABASE_URL="file:./db/custom.db" docker compose exec web bun run prisma/migrate-sqlite-to-postgres.ts
```

**Checklist:**
- [ ] `docker compose up -d --build` completa sin errores
- [ ] Todos los 6 servicios están "running"
- [ ] PostgreSQL está "healthy"
- [ ] Redis está "healthy"
- [ ] Web está "healthy"
- [ ] Worker está "running"
- [ ] Notifications está "healthy"
- [ ] Nginx está "running"
- [ ] `prisma migrate deploy` completa sin errores
- [ ] Seed crea el usuario admin
- [ ] Password de admin anotado

### Fase 3: Validación Post-Deploy

```bash
# Ejecutar validación de conexiones
./scripts/validate-postgres-redis.sh

# Ejecutar smoke test
./scripts/smoke-test.sh http://localhost
```

**Checklist PostgreSQL:**
- [ ] pg_isready responde OK
- [ ] SELECT 1 exitoso
- [ ] 30+ tablas creadas
- [ ] users table tiene registros
- [ ] services table tiene 6000+ registros
- [ ] orders table tiene registros
- [ ] transactions table tiene registros
- [ ] sequences table existe
- [ ] audit_logs table tiene columna userAgent

**Checklist Redis:**
- [ ] PING → PONG
- [ ] SET/GET funciona
- [ ] Versión de Redis: 7.x
- [ ] Memoria en uso < 256MB

**Checklist App:**
- [ ] /api/health/db muestra database.connected: true
- [ ] /api/health/db muestra database.provider: postgresql
- [ ] /api/health/ready muestra redis.healthy: true
- [ ] Worker muestra "workers running" en logs
- [ ] Notifications /healthz responde OK

**Checklist Nginx:**
- [ ] HTTP → HTTPS redirect (301/302)
- [ ] HTTPS responde (200)
- [ ] /api/health/live accesible via Nginx
- [ ] /socket.io/ proxado a notifications

### Fase 4: SSL + DNS

```bash
# 1. Obtener certificados SSL
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com

# 2. Copiar certificados
mkdir -p certs
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem certs/

# 3. Reiniciar Nginx
docker compose restart nginx

# 4. Configurar auto-renovación
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/tudominio.com/*.pem /opt/novsmm/certs/ && docker compose restart nginx" | crontab -
```

**Checklist:**
- [ ] Certbot obtiene certificados
- [ ] Certificados copiados a certs/
- [ ] Nginx reinicia sin errores
- [ ] HTTPS funciona con certificado válido
- [ ] Auto-renovación configurada en cron

### Fase 5: DNS + Cloudflare

```bash
# 1. Configurar DNS A record
# tudominio.com → IP_DEL_VPS

# 2. Verificar propagación DNS
dig tudominio.com
# Debe mostrar la IP del VPS

# 3. Configurar Cloudflare (opcional pero recomendado)
# - DNS: A record → IP del VPS (Proxied)
# - SSL/TLS: Full (strict)
# - Speed: Auto Minify + Brotli
```

**Checklist:**
- [ ] DNS A record configurado
- [ ] DNS propaga (dig muestra IP correcta)
- [ ] Cloudflare configurado (si aplica)
- [ ] SSL/TLS mode: Full (strict)

### Fase 6: Google OAuth

```bash
# 1. En Google Cloud Console:
#    - Actualizar Authorized redirect URIs:
#      https://tudominio.com/api/auth/callback/google

# 2. En NOVSMM admin panel:
#    - Ir a Social Auth
#    - Ingresar Google Client ID + Secret
#    - Guardar

# 3. Probar login con Google
```

**Checklist:**
- [ ] Redirect URI actualizado en Google Console
- [ ] Credenciales guardadas en admin panel
- [ ] Login con Google redirige a accounts.google.com
- [ ] Callback retorna a NOVSMM con sesión activa

### Fase 7: Webhooks de Pago

```bash
# 1. Stripe Dashboard:
#    - Webhook URL: https://tudominio.com/api/webhooks/stripe
#    - Events: payment_intent.*, charge.refunded, checkout.session.*, customer.subscription.*, invoice.*
#    - Copiar signing secret → STRIPE_WEBHOOK_SECRET en .env

# 2. Mercado Pago:
#    - Webhook URL: https://tudominio.com/api/webhooks/mercadopago
#    - Copiar webhook secret → MP_WEBHOOK_SECRET en .env

# 3. NowPayments:
#    - IPN URL: https://tudominio.com/api/webhooks/nowpayments
#    - Copiar IPN secret → NOWPAYMENTS_IPN_SECRET en .env

# 4. Reiniciar después de configurar
docker compose restart web worker
```

**Checklist:**
- [ ] Stripe webhook URL configurada
- [ ] Stripe signing secret en .env
- [ ] MP webhook URL configurada
- [ ] MP webhook secret en .env
- [ ] NowPayments IPN URL configurada
- [ ] NowPayments IPN secret en .env
- [ ] Web reiniciado después de configurar

### Fase 8: Pruebas de Carga

```bash
# Instalar k6
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt update && sudo apt install k6

# Test 1: Carga normal (100 usuarios, 5 min)
k6 run --env BASE_URL=https://tudominio.com scripts/load-test.js

# Test 2: Carga pico (1000 usuarios)
k6 run --env BASE_URL=https://tudominio.com --env VUS=1000 scripts/load-test.js

# Test 3: Stress test (órdenes)
k6 run --env BASE_URL=https://tudominio.com --env STRESS=true scripts/load-test.js
```

**Checklist:**
- [ ] p95 latency < 500ms
- [ ] Error rate < 1%
- [ ] 0 race conditions en creación de órdenes
- [ ] 0 saldos negativos
- [ ] Worker procesa jobs sin cuello de botella
- [ ] Redis no excede 256MB

### Fase 9: Backups

```bash
# 1. Crear directorio de backups
mkdir -p /backups

# 2. Configurar cron
crontab -e

# Añadir:
0 2 * * * /opt/novsmm/scripts/backup-db.sh >> /var/log/novsmm-backup.log 2>&1
0 3 * * * /opt/novsmm/scripts/backup-uploads.sh >> /var/log/novsmm-backup.log 2>&1

# 3. Probar backup manualmente
./scripts/backup-db.sh
ls -la /backups/
```

**Checklist:**
- [ ] Directorio /backups creado
- [ ] backup-db.sh ejecuta sin errores
- [ ] Backup creado en /backups/
- [ ] Cron configurado (nightly 2 AM)
- [ ] Restore probado (opcional pero recomendado)

### Fase 10: Go-Live Final

```bash
# 1. Verificación final
./scripts/pre-deploy-check.sh
./scripts/validate-postgres-redis.sh
./scripts/smoke-test.sh https://tudominio.com

# 2. Monitorear por 30 minutos
docker compose logs -f web
curl -s https://tudominio.com/api/health/ready | python3 -m json.tool

# 3. Verificar Sentry (si configurado)
# 4. Verificar Prometheus metrics
curl -s https://tudominio.com/api/metrics | head -10

# 5. Probar login real
# 6. Probar orden real
# 7. Probar pago real (con monto mínimo)
```

**Checklist Final:**
- [ ] Pre-deploy check: 0 FAIL
- [ ] Post-deploy validation: 0 FAIL
- [ ] Smoke test: 0 FAIL
- [ ] SSL válido
- [ ] DNS propaga
- [ ] Google OAuth funciona
- [ ] Webhooks configurados
- [ ] Pruebas de carga pasan
- [ ] Backups configurados
- [ ] Monitoreo activo (health + Sentry + metrics)
- [ ] Login real funciona
- [ ] Orden real funciona
- [ ] Pago real funciona

---

## COMANDOS DE REFERENCIA RÁPIDA

```bash
# Ver estado de servicios
docker compose ps

# Ver logs
docker compose logs -f web
docker compose logs -f worker
docker compose logs -f postgres
docker compose logs -f redis

# Reiniciar un servicio
docker compose restart web

# Reiniciar todo
docker compose restart

# Parar todo
docker compose down

# Actualizar código
git pull origin main
docker compose up -d --build

# Abrir psql shell
docker compose exec postgres psql -U novsmm -d novsmm

# Abrir redis-cli
docker compose exec redis redis-cli

# Ver variables de entorno del contenedor
docker compose exec web printenv | grep -E "DATABASE_URL|REDIS_URL|NEXTAUTH"

# Verificar health
curl -s https://tudominio.com/api/health/ready | python3 -m json.tool

# Verificar métricas
curl -s https://tudominio.com/api/metrics | head -20

# Backup manual
./scripts/backup-db.sh

# Restore
./scripts/restore-db.sh /backups/novsmm_YYYYMMDD_020000.sql.gz
```

---

## CONFIRMACIÓN FINAL

**Este documento debe ser completado después de ejecutar todos los scripts en tu VPS real.**

Una vez que todos los checklist estén marcados como ✅, la infraestructura estará lista para producción.

**IMPORTANTE:** No puedo ejecutar estas pruebas por ti porque el sandbox no tiene Docker, PostgreSQL, ni Redis. Debes ejecutar los scripts en tu VPS real y reportar los resultados.

### Próximos pasos:

1. **Provisiona tu VPS** (Ubuntu 22.04+, 4GB RAM, 20GB disco)
2. **Instala Docker** (`curl -fsSL https://get.docker.com | sh`)
3. **Clona el repositorio** a `/opt/novsmm`
4. **Configura .env** (`cp .env.example .env && nano .env`)
5. **Verifica el esquema PostgreSQL canónico** (`grep -A4 '^datasource db' prisma/schema.prisma`)
6. **Ejecuta pre-deploy check** (`./scripts/pre-deploy-check.sh`)
7. **Deploya** (`docker compose up -d --build`)
8. **Inicializa DB** (`docker compose exec web bun run prisma migrate deploy`)
9. **Ejecuta post-deploy validation** (`./scripts/validate-postgres-redis.sh`)
10. **Ejecuta smoke test** (`./scripts/smoke-test.sh https://tudominio.com`)
11. **Configura SSL + DNS + Cloudflare**
12. **Ejecuta pruebas de carga** (`k6 run scripts/load-test.js`)
13. **Configura backups** (cron)
14. **Go live!**

Cuando tengas los resultados de los scripts en tu VPS, compártelos conmigo y te ayudaré a interpretarlos y resolver cualquier problema.
