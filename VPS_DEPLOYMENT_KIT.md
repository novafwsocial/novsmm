# NOVSMM — VPS Deployment Kit (Guía Maestra)

**Kit completo de validación y despliegue para VPS real.**
**10 fases — desde pre-deploy hasta go-live.**

---

## Kit de Scripts

| Script | Propósito | Cuándo ejecutar |
|--------|-----------|----------------|
| `scripts/pre-deploy-check.sh` | Verifica que el VPS esté listo | Antes de deployar |
| `scripts/deploy.sh` | Deploy completo con un comando | Deploy inicial |
| `scripts/validate-postgres-redis.sh` | Valida conexiones PostgreSQL + Redis | Después de deployar |
| `scripts/smoke-test.sh` | Pruebas funcionales end-to-end | Después de validar |
| `scripts/load-test.js` | Pruebas de carga con k6 | Después de smoke test |
| `scripts/healthcheck.sh` | Monitoreo continuo | Siempre (cron) |
| `scripts/backup.sh` | Backup de DB + uploads + config | Diario (cron 2 AM) |
| `scripts/restore.sh` | Restore interactivo | Emergencia |
| `scripts/monitor-setup.sh` | Levanta Prometheus + Grafana | Después de deployar |

---

## Fase 1: Pre-Deploy (en VPS)

```bash
# SSH al VPS
ssh root@TU_VPS_IP

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker

# Instalar Docker Compose v2
sudo apt install docker-compose-plugin

# Clonar repositorio
git clone https://github.com/tuusuario/novsmm.git /opt/novsmm
cd /opt/novsmm

# Configurar entorno
cp .env.example .env
nano .env  # Editar con valores reales

# Generar secrets
openssl rand -hex 32  # → NEXTAUTH_SECRET
openssl rand -hex 24  # → LICENSE_ENCRYPTION_KEY
openssl rand -hex 24  # → NOTIFICATIONS_SERVICE_SECRET
openssl rand -hex 16  # → POSTGRES_PASSWORD

# Cambiar a schema PostgreSQL
cp prisma/schema.postgres.prisma prisma/schema.prisma

# Ejecutar pre-deploy check
./scripts/pre-deploy-check.sh
```

### Checklist Fase 1
- [ ] Docker instalado y activo
- [ ] Docker Compose v2 disponible
- [ ] Puertos 80, 443, 3000, 5432, 6379 disponibles
- [ ] RAM ≥ 4GB
- [ ] Disco ≥ 20GB
- [ ] .env con todas las variables
- [ ] DATABASE_URL = postgresql://novsmm:PASS@postgres:5432/novsmm
- [ ] REDIS_URL = redis://redis:6379
- [ ] Schema PostgreSQL activo
- [ ] Firewall: puertos 80, 443, 22 abiertos
- [ ] pre-deploy-check.sh: 0 FAIL

---

## Fase 2: Deploy (one command)

```bash
# Deploy completo con un solo comando
./scripts/deploy.sh

# Si necesitas migrar datos desde SQLite:
./scripts/deploy.sh --migrate-sqlite
```

El script `deploy.sh` ejecuta automáticamente:
1. ✅ Verifica prerrequisitos
2. ✅ Build de imágenes Docker
3. ✅ docker compose up (6 servicios)
4. ✅ Espera que todos estén healthy
5. ✅ prisma migrate deploy (crea tablas)
6. ✅ prisma seed (crea admin — **anota el password**)
7. ✅ Migración SQLite → PostgreSQL (con --migrate-sqlite)
8. ✅ Smoke test final

### Checklist Fase 2
- [ ] deploy.sh completa sin errores
- [ ] 6 servicios running (postgres, redis, web, worker, notifications, nginx)
- [ ] PostgreSQL: 30+ tablas
- [ ] Seed: admin user creado (anotar password)
- [ ] Smoke test: health + CSRF + webhooks OK
- [ ] PostgreSQL provider: postgresql (no sqlite)
- [ ] Redis: conectado (no in-memory fallback)

---

## Fase 3: Validación Post-Deploy

```bash
# Validar conexiones reales
./scripts/validate-postgres-redis.sh

# Smoke test funcional
./scripts/smoke-test.sh http://localhost
```

### Checklist Fase 3
- [ ] PostgreSQL: pg_isready OK
- [ ] PostgreSQL: SELECT 1 OK
- [ ] PostgreSQL: 30+ tablas
- [ ] PostgreSQL: users con datos
- [ ] PostgreSQL: services con 6000+ registros
- [ ] Redis: PING → PONG
- [ ] Redis: SET/GET funciona
- [ ] App → PostgreSQL: connected (provider: postgresql)
- [ ] App → Redis: healthy (no fallback)
- [ ] Nginx: HTTP → HTTPS redirect
- [ ] Worker: running
- [ ] Notifications: /healthz OK
- [ ] Variables DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET cargadas en contenedor

---

## Fase 4: SSL con Let's Encrypt

```bash
# Detener nginx temporalmente
docker compose stop nginx

# Obtener certificados
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com

# Copiar certificados
mkdir -p certs
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem certs/
sudo chown -R $USER:$USER certs/

# Reiniciar nginx
docker compose start nginx

# Verificar HTTPS
curl -I https://tudominio.com

# Auto-renovación (cron)
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/tudominio.com/*.pem /opt/novsmm/certs/ && docker compose -f /opt/novsmm/docker-compose.yml restart nginx" | sudo crontab -
```

### Checklist Fase 4
- [ ] Certbot obtiene certificados
- [ ] Certificados copiados a certs/
- [ ] Nginx reinicia sin errores
- [ ] HTTPS funciona (curl -I https://tudominio.com → 200)
- [ ] Certificado válido (no self-signed)
- [ ] HTTP → HTTPS redirect funciona
- [ ] Auto-renovación en cron

---

## Fase 5: Cloudflare

1. **DNS**: A record `tudominio.com` → IP del VPS (Proxied)
2. **DNS**: A record `www.tudominio.com` → IP del VPS (Proxied)
3. **SSL/TLS**: Mode = Full (strict)
4. **Speed**: Auto Minify (HTML, CSS, JS) + Brotli
5. **Caching**: Standard level, 4h browser TTL
6. **Firewall**: Allow only CF IPs if needed

### Checklist Fase 5
- [ ] DNS A records configurados
- [ ] DNS propaga (dig tudominio.com muestra IP del VPS)
- [ ] SSL/TLS: Full (strict)
- [ ] Auto Minify activado
- [ ] Brotli activado

---

## Fase 6: Google OAuth

```bash
# 1. En Google Cloud Console:
#    Credentials → OAuth 2.0 Client ID → Edit
#    Authorized redirect URIs:
#      https://tudominio.com/api/auth/callback/google
#      https://www.tudominio.com/api/auth/callback/google

# 2. En NOVSMM admin panel:
#    Admin → Social Auth → Google OAuth
#    Ingresar Client ID + Client Secret
#    Guardar

# 3. Probar login con Google
```

### Checklist Fase 6
- [ ] Redirect URI en Google Console: https://tudominio.com/api/auth/callback/google
- [ ] Credenciales guardadas en admin panel
- [ ] Login con Google redirige a accounts.google.com
- [ ] Callback retorna a NOVSMM con sesión activa
- [ ] Nuevo usuario se crea en PostgreSQL

---

## Fase 7: Webhooks de Pago

```bash
# Editar .env con los secrets de webhooks
nano .env

# STRIPE_WEBHOOK_SECRET=whsec_...
# MP_WEBHOOK_SECRET=...
# NOWPAYMENTS_IPN_SECRET=...

# Reiniciar web + worker
docker compose restart web worker
```

**Configurar en cada dashboard:**
- **Stripe**: https://tudominio.com/api/webhooks/stripe
- **Mercado Pago**: https://tudominio.com/api/webhooks/mercadopago
- **NowPayments**: https://tudominio.com/api/webhooks/nowpayments

### Checklist Fase 7
- [ ] Stripe webhook URL + signing secret en .env
- [ ] MP webhook URL + secret en .env
- [ ] NowPayments IPN URL + secret en .env
- [ ] web + worker reiniciados
- [ ] Stripe webhook test: 200 con firma válida
- [ ] MP webhook test: 200 con firma válida
- [ ] NowPayments webhook test: 200 con firma válida

---

## Fase 8: Pruebas de Carga (k6)

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

### Checklist Fase 8
- [ ] k6 instalado
- [ ] Test 1 (100 VUs): p95 < 500ms, error rate < 1%
- [ ] Test 2 (1000 VUs): p95 < 2s, error rate < 5%
- [ ] Test 3 (stress): 0 race conditions, 0 saldos negativos
- [ ] Worker procesa jobs sin cuello de botella
- [ ] Redis no excede 256MB
- [ ] PostgreSQL no excede connection limit

---

## Fase 9: Backups + Monitoreo

```bash
# ── Backups ──
# Probar backup manual
./scripts/backup.sh

# Configurar cron (nightly 2 AM)
crontab -e
# Añadir:
0 2 * * * /opt/novsmm/scripts/backup.sh >> /var/log/novsmm-backup.log 2>&1

# Probar restore (en entorno de test)
./scripts/restore.sh

# ── Monitoreo ──
# Levantar Prometheus + Grafana + AlertManager
./scripts/monitor-setup.sh

# Configurar alertas en Slack
nano monitoring/alertmanager.yml
# Reemplazar REPLACE_WITH_YOUR_WEBHOOK con tu webhook de Slack
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml restart alertmanager

# Healthcheck continuo (cada 5 min)
crontab -e
# Añadir:
*/5 * * * * /opt/novsmm/scripts/healthcheck.sh >> /var/log/novsmm-health.log 2>&1
```

### Checklist Fase 9
- [ ] backup.sh: ejecuta sin errores
- [ ] Backup: PostgreSQL + uploads + config
- [ ] Backup: verificación de integridad OK
- [ ] Cron backup: configurado (2 AM)
- [ ] restore.sh: probado en entorno de test
- [ ] Prometheus: healthy (http://localhost:9090)
- [ ] Grafana: healthy (http://localhost:3001)
- [ ] Grafana: datasource Prometheus configurado
- [ ] AlertManager: configurado con Slack webhook
- [ ] Healthcheck cron: configurado (cada 5 min)
- [ ] Alertas: NovsmmDown, HighErrorRate, HighDiskUsage activas

---

## Fase 10: Go-Live

```bash
# ── Verificación final ──
echo "═══ GO-LIVE VERIFICATION ═══"

# 1. Pre-deploy check
./scripts/pre-deploy-check.sh

# 2. Post-deploy validation
./scripts/validate-postgres-redis.sh

# 3. Smoke test
./scripts/smoke-test.sh https://tudominio.com

# 4. Health check
./scripts/healthcheck.sh

# 5. Monitorear por 30 minutos
docker compose logs -f web

# 6. Verificar todo
curl -s https://tudominio.com/api/health/ready | python3 -m json.tool
curl -s https://tudominio.com/api/metrics | head -10
```

### Checklist Final Go-Live
- [ ] pre-deploy-check.sh: 0 FAIL
- [ ] validate-postgres-redis.sh: 0 FAIL
- [ ] smoke-test.sh: 0 FAIL
- [ ] healthcheck.sh: 0 FAIL
- [ ] SSL válido (https://tudominio.com)
- [ ] DNS propaga
- [ ] Google OAuth funciona
- [ ] Webhooks configurados y probados
- [ ] Pruebas de carga pasan
- [ ] Backups configurados + probados
- [ ] Prometheus + Grafana + AlertManager activos
- [ ] Healthcheck cron activo
- [ ] Login real funciona
- [ ] Orden real funciona
- [ ] Pago real funciona (monto mínimo)
- [ ] 30 minutos de monitoreo sin errores

**¡GO LIVE!** 🚀

---

## Recuperación ante Desastres

### RTO: 30 minutos | RPO: 24 horas

```bash
# ── Backup manual inmediato ──
./scripts/backup.sh

# ── Restore en caso de desastre ──
# 1. Provisionar nuevo VPS
# 2. git clone + cp .env.example .env + configurar
# 3. ./scripts/deploy.sh
# 4. ./scripts/restore.sh /backups/novsmm_db_ULTIMO.sql.gz
# 5. Actualizar DNS al nuevo VPS
# 6. Verificar con ./scripts/smoke-test.sh

# ── DR Drill (trimestral) ──
# 1. Provisionar VPS de test
# 2. Restaurar último backup
# 3. Verificar datos: users, orders, transactions, services
# 4. Probar login + orden + pago
# 5. Destruir VPS de test
```

---

## Comandos de Referencia

```bash
# Estado de servicios
docker compose ps

# Logs
docker compose logs -f web
docker compose logs -f worker
docker compose logs -f postgres
docker compose logs -f redis

# Reiniciar
docker compose restart web
docker compose restart nginx

# Actualizar código
git pull origin main
docker compose up -d --build

# psql shell
docker compose exec postgres psql -U novsmm -d novsmm

# redis-cli
docker compose exec redis redis-cli

# Ver variables del contenedor
docker compose exec web printenv | grep -E "DATABASE_URL|REDIS_URL"

# Health check manual
curl -s https://tudominio.com/api/health/ready | python3 -m json.tool

# Métricas
curl -s https://tudominio.com/api/metrics | head -20

# Backup manual
./scripts/backup.sh

# Restore
./scripts/restore.sh

# Monitoreo continuo
./scripts/healthcheck.sh --watch
```
