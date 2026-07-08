# NOVSMM — Guía de Deploy en VPS de 2GB RAM (IONOS VPS S+)

> **VPS:** IONOS VPS S+ — 2 vCores, 2GB RAM, 90GB NVMe  
> **Modo:** Low Memory (SQLite + in-memory cache, sin Redis/PostgreSQL/Monitoring)  
> **RAM esperada:** ~800MB-1GB (deja ~1GB libre)

---

## Arquitectura Low-Memory vs Completa

| Componente | Low Memory (2GB) | Completa (8GB+) |
|------------|------------------|-----------------|
| **Database** | SQLite (file) | PostgreSQL |
| **Cache** | In-memory (no persistente) | Redis |
| **Monitoring** | ❌ Deshabilitado | ✅ Prometheus + Grafana + AlertManager |
| **Workers** | In-process (setImmediate) | Proceso separado (BullMQ) |
| **RAM total** | ~800MB-1GB | ~3-4GB |

---

## Paso 1: Preparar el VPS

```bash
# Conectarse al VPS por SSH
ssh root@TU_IP_DEL_VPS

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose v2 (si no se instaló automáticamente)
apt install -y docker-compose-plugin

# Verificar
docker --version
docker compose version
```

## Paso 2: Clonar el proyecto

```bash
cd /opt
git clone https://github.com/tu-usuario/novsmm.git
cd novsmm
```

## Paso 3: Configurar .env

```bash
cp .env.example .env
nano .env
```

**Variables OBLIGATORIAS:**
```bash
DATABASE_URL=file:/app/db/custom.db
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=https://tu-dominio.com
LICENSE_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

**Opcionales (pagos reales):**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MP_ACCESS_TOKEN=...
NOWPAYMENTS_IPN_SECRET=...
```

## Paso 4: Deploy

```bash
chmod +x scripts/deploy-lowmem.sh
./scripts/deploy-lowmem.sh
```

El script automáticamente:
1. ✅ Crea un swap file de 2GB (previene OOM kills)
2. ✅ Construye la imagen Docker
3. ✅ Inicia los contenedores (web + nginx)
4. ✅ Ejecuta migraciones de DB
5. ✅ Crea el admin account (muestra password una vez)
6. ✅ Muestra reporte de memoria

## Paso 5: Configurar SSL

```bash
# Instalar certbot
apt install -y certbot

# Obtener certificado SSL
certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com

# Copiar certificados
mkdir -p certs
cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem certs/
cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem certs/

# Reiniciar nginx
docker compose -f docker-compose.lowmem.yml restart nginx
```

## Paso 6: Configurar DNS

Apunta tu dominio al IP del VPS:
```
A    tu-dominio.com    → IP_DEL_VPS
A    www.tu-dominio.com → IP_DEL_VPS
```

## Paso 7: Cron de backups

```bash
# Editar crontab
crontab -e

# Backup diario a las 2 AM
0 2 * * * /opt/novsmm/scripts/backup.sh >> /var/log/novsmm-backup.log 2>&1

# DR drill mensual (1er día del mes a las 6 AM)
0 6 1 * * /opt/novsmm/scripts/dr-drill.sh >> /var/log/novsmm-dr-drill.log 2>&1
```

---

## Gestión del servidor

```bash
# Ver estado
docker compose -f docker-compose.lowmem.yml ps

# Ver logs
docker compose -f docker-compose.lowmem.yml logs -f web

# Reiniciar
docker compose -f docker-compose.lowmem.yml restart

# Detener
docker compose -f docker-compose.lowmem.yml down

# Actualizar (después de git pull)
git pull
docker compose -f docker-compose.lowmem.yml up -d --build
```

---

## Limitaciones del modo Low-Memory

1. **SQLite**: Más lento que PostgreSQL bajo alta concurrencia. Fine para <100 usuarios concurrentes.
2. **Cache in-memory**: Se pierde al reiniciar. La app hace fetch a DB más frecuentemente.
3. **Sin monitoring**: No hay Prometheus/Grafana. Los health checks siguen funcionando (`/api/health/live`).
4. **Workers in-process**: Los jobs de background corren en el mismo proceso que la app web. Si un job es pesado, puede ralentizar brevemente las requests.

---

## Migrar a modo completo (cuando tengas 8GB+ RAM)

```bash
# 1. Migrar SQLite → PostgreSQL
bun run prisma/migrate-sqlite-to-postgres.ts

# 2. Cambiar docker-compose
docker compose -f docker-compose.lowmem.yml down
docker compose up -d --build  # usa docker-compose.yml (completo)

# 3. Actualizar .env
# Cambiar DATABASE_URL a: postgresql://novsmm:PASS@postgres:5432/novsmm
# Añadir: REDIS_URL=redis://redis:6379
```

---

## Troubleshooting

### El servidor se cae por OOM
```bash
# Verificar swap
swapon --show
free -h

# Si no hay swap, crearlo manualmente
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo "/swapfile none swap sw 0 0" >> /etc/fstab
echo 10 > /proc/sys/vm/swappiness
```

### La app responde lento
```bash
# Verificar memoria
docker stats

# Si el contenedor web usa >400MB, considerar upgrade a 4GB VPS
# Mientras tanto, reducir NODE_OPTIONS:
# En docker-compose.lowmem.yml, cambiar:
#   NODE_OPTIONS: "--max-old-space-size=256"
```

### Error de base de datos
```bash
# SQLite es un archivo — respaldarlo manualmente
cp /opt/novsmm/db/custom.db /backups/custom.db.bak

# Si se corrompe, restaurar de backup
cp /backups/custom.db.bak /opt/novsmm/db/custom.db
docker compose -f docker-compose.lowmem.yml restart web
```
