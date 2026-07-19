# NOVSMM — Production Deployment Guide

Complete guide for deploying NOVSMM to a VPS with Docker, Nginx, and Cloudflare.

## Architecture

```
Internet
   ↓
Cloudflare (CDN + WAF + DDoS protection)
   ↓
Nginx (TLS termination + reverse proxy + rate limiting)
   ↓
Next.js (port 3000)  ←  Nginx  →  Notifications (port 3003, Socket.IO)
   ↓
PostgreSQL (port 5432)  +  Redis (port 6379)
   ↓
BullMQ Worker (background jobs)
```

## Prerequisites

- **VPS**: 2+ CPU cores, 4+ GB RAM, 40+ GB SSD
- **OS**: Ubuntu 22.04 LTS (or Debian 12)
- **Domain**: `novsmm.com` (or your domain) with DNS access
- **SSH access**: root or sudo user

## Step 1: VPS Setup

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose v2
apt install docker-compose-plugin

# Create app directory
mkdir -p /opt/novsmm
cd /opt/novsmm
```

## Step 2: Deploy the Code

```bash
# Option A: Clone from Git
git clone https://github.com/yourusername/novsmm.git .
# OR: Upload via scp
# scp -r ./* root@your-vps-ip:/opt/novsmm/
```

## Step 3: Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your real values
nano .env
```

**Required values to set:**
```bash
# Generate secrets
openssl rand -hex 32  # → NEXTAUTH_SECRET
openssl rand -hex 24  # → LICENSE_ENCRYPTION_KEY
openssl rand -hex 24  # → NOTIFICATIONS_SERVICE_SECRET
openssl rand -hex 16  # → POSTGRES_PASSWORD

# Set these in .env:
DATABASE_URL=postgresql://novsmm:<POSTGRES_PASSWORD>@postgres:5432/novsmm?connection_limit=10&pool_timeout=20
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=https://novsmm.com
LICENSE_ENCRYPTION_KEY=<generated>
NOTIFICATIONS_SERVICE_SECRET=<generated>
POSTGRES_DB=novsmm
POSTGRES_USER=novsmm
POSTGRES_PASSWORD=<generated>
REDIS_URL=redis://redis:6379
HUNTSMM_API_KEY=your_huntsmm_key
```

## Step 4: SSL Certificates

```bash
# Install certbot
apt install certbot

# Get Let's Encrypt certificates (stop nginx first if running)
certbot certonly --standalone -d novsmm.com -d www.novsmm.com

# Copy certificates to the certs directory
mkdir -p certs
cp /etc/letsencrypt/live/novsmm.com/fullchain.pem certs/
cp /etc/letsencrypt/live/novsmm.com/privkey.pem certs/

# Set up auto-renewal (add to crontab)
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/novsmm.com/*.pem /opt/novsmm/certs/ && docker compose restart nginx" | crontab -
```

## Step 5: Verify the canonical PostgreSQL schema

```bash
# prisma/schema.prisma is the canonical schema used by the application.
# Do not overwrite it with the legacy schema.postgres.prisma reference.
grep -A4 '^datasource db' prisma/schema.prisma
# Should show: provider = "postgresql"
```

## Step 6: Start Services

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f web
```

## Step 7: Initialize Database

```bash
# Run Prisma migrations (creates all tables)
docker compose exec web bun run prisma migrate deploy

# Run the seed (creates admin user — PASSWORD IS PRINTED ONCE)
docker compose exec web bun run prisma/seed.ts

# If migrating from SQLite, run the data migration script:
# SQLITE_DATABASE_URL="file:./db/custom.db" docker compose exec web bun run prisma/migrate-sqlite-to-postgres.ts
```

## Step 8: Configure Cloudflare

1. Log in to [Cloudflare](https://dash.cloudflare.com)
2. Add your domain (`novsmm.com`)
3. Update nameservers at your registrar
4. Go to **DNS** → Add records:
   - `A` record: `novsmm.com` → your VPS IP (Proxied)
   - `A` record: `www.novsmm.com` → your VPS IP (Proxied)
5. Go to **SSL/TLS**:
   - Encryption mode: **Full (strict)**
   - Edge Certificates: Enable all
6. Go to **Speed** → **Optimization**:
   - Auto Minify: HTML, CSS, JS
   - Brotli: On
7. Go to **Caching**:
   - Caching Level: Standard
   - Browser Cache TTL: 4 hours

## Step 9: Update Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   ```
   https://novsmm.com/api/auth/callback/google
   https://www.novsmm.com/api/auth/callback/google
   ```
4. Save

## Step 10: Configure Payment Webhooks

### Stripe
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://novsmm.com/api/webhooks/stripe`
3. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in `.env`

### Mercado Pago
1. Go to [Mercado Pago Webhooks](https://www.mercadopago.com.mx/developers/panel/notifications)
2. Add URL: `https://novsmm.com/api/webhooks/mercadopago`
3. Topics: `payment`
4. Set `MP_WEBHOOK_SECRET` in `.env`

### NowPayments
1. Go to [NowPayments](https://nowpayments.io) → Account Settings → IPN
2. Add URL: `https://novsmm.com/api/webhooks/nowpayments`
3. Copy IPN secret → `NOWPAYMENTS_IPN_SECRET` in `.env`

## Step 11: Set Up Backups

```bash
# Create backup directory
mkdir -p /backups

# Set up cron jobs
crontab -e

# Add these lines:
# Nightly DB backup at 2 AM
0 2 * * * /opt/novsmm/scripts/backup.sh >> /var/log/novsmm-backup.log 2>&1

# Daily uploads backup at 3 AM (if using S3)
0 3 * * * /opt/novsmm/scripts/backup-uploads.sh >> /var/log/novsmm-backup.log 2>&1

# Weekly full backup verification at 4 AM on Sundays
0 4 * * 0 /opt/novsmm/scripts/backup.sh >> /var/log/novsmm-backup-weekly.log 2>&1
```

## Step 12: Configure Sentry (Optional)

1. Create account at [Sentry.io](https://sentry.io)
2. Create a Node.js project
3. Copy the DSN
4. Add to `.env`:
   ```
   SENTRY_DSN=https://xxx@sentry.io/123
   SENTRY_ENVIRONMENT=production
   ```
5. Restart: `docker compose restart web worker`

## Step 13: Verify Deployment

```bash
# Check all services are healthy
curl https://novsmm.com/api/health/live
curl https://novsmm.com/api/health/ready
curl https://novsmm.com/api/health/db

# Check metrics
curl https://novsmm.com/api/metrics

# Check SSL
curl -I https://novsmm.com

# Test login
# Open https://novsmm.com in your browser
```

## Common Operations

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web
docker compose logs -f worker
docker compose logs -f notifications

# Last 100 lines
docker compose logs --tail 100 web
```

### Restart Services
```bash
# Restart everything
docker compose restart

# Restart specific service
docker compose restart web

# Rebuild after code changes
docker compose up -d --build web
```

### Scale Services
```bash
# Run 3 web instances (load balanced by nginx)
docker compose up -d --scale web=3

# Run 2 workers
docker compose up -d --scale worker=2
```

### Database Operations
```bash
# Run migration
docker compose exec web bun run prisma migrate deploy

# Reset database (DESTRUCTIVE)
docker compose exec web bun run prisma migrate reset

# Open psql shell
docker compose exec postgres psql -U novsmm -d novsmm

# Backup
./scripts/backup.sh

# Restore
./scripts/restore.sh /backups/novsmm_20250115_020000.sql.gz
```

### Update to New Version
```bash
cd /opt/novsmm
git pull origin main
docker compose pull
docker compose up -d --build
docker compose exec web bun run prisma migrate deploy
```

## Troubleshooting

### Service won't start
```bash
docker compose logs web
docker compose ps
```

### Database connection refused
```bash
# Check postgres is healthy
docker compose ps postgres
docker compose logs postgres

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### WebSocket not connecting
```bash
# Check notifications service
docker compose logs notifications
curl http://localhost:3003/healthz

# Check nginx WebSocket config
docker compose exec nginx nginx -t
```

### SSL certificate expired
```bash
# Renew
certbot renew
cp /etc/letsencrypt/live/novsmm.com/*.pem /opt/novsmm/certs/
docker compose restart nginx
```

### Out of memory
```bash
# Check memory usage
docker stats

# Increase swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Rollback

```bash
# Roll back to previous Docker image
docker compose pull
docker compose up -d

# Roll back database (if migration broke something)
./scripts/restore.sh /backups/novsmm_<previous_date>.sql.gz
```
