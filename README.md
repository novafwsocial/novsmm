# NOVSMM

> Infrastructure for Social Media Marketing at Scale

NOVSMM is an enterprise-grade SMM (Social Media Marketing) marketplace platform that enables resellers, agencies, and enterprises to buy and sell social media services at wholesale prices with automated fulfillment.

## Features

- **Marketplace** — Buy services from 6,000+ SMM offerings across 20+ platforms (Instagram, TikTok, YouTube, Spotify, Telegram, X, Twitch, Discord, and more)
- **Reseller Marketplace** — Create your own offers with custom margins (up to 50%)
- **Multi-Provider** — HuntSMM integration with extensible provider architecture
- **Payments** — Stripe, Mercado Pago, NowPayments (crypto), PayPal, Manual
- **Wallet System** — Balance, held balance, transactions, invoices, CSV export
- **Order Management** — Drip-feed, mass orders, order tracking, priority queues
- **Subscriptions** — Plan-based access (free, starter, growth, enterprise)
- **Loyalty Program** — Points, tiers (Bronze→Diamond), achievements, multipliers
- **Referral System** — Tiered commissions (5%–12%), referral tracking
- **AI Insights** — Spending analysis + service recommendations (powered by z-ai-web-dev-sdk)
- **Real-time Notifications** — WebSocket push (Socket.IO + Redis adapter)
- **Multi-language** — English, Spanish, Portuguese, French, German
- **Admin Panel** — 20+ management tabs (users, orders, services, providers, payments, licenses, API keys, coupons, promotions, roles, logs, etc.)
- **Security** — 2FA TOTP, CSRF protection, rate limiting, HMAC webhook verification, AES-256-GCM encryption, audit logging
- **Observability** — Health endpoints, Prometheus metrics, Sentry error tracking, structured logging (pino)
- **PWA Ready** — Manifest + service worker support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | SQLite (dev) / PostgreSQL 16 (production) |
| ORM | Prisma 7 |
| Cache/Queue | Redis 7 + BullMQ |
| Auth | NextAuth.js v4 (Credentials + Google OAuth + 2FA TOTP) |
| UI | Tailwind CSS 4 + shadcn/ui (New York) + Framer Motion |
| State | Zustand + TanStack Query v5 |
| Real-time | Socket.IO 4 + @socket.io/redis-adapter |
| Payments | Stripe, Mercado Pago, NowPayments, PayPal |
| AI | z-ai-web-dev-sdk (LLM, VLM, TTS, ASR, Image Generation, Web Search) |
| Logging | pino (structured JSON) |
| Metrics | prom-client (Prometheus) |
| Error Tracking | Sentry (optional) |
| Containerization | Docker + docker-compose |
| Reverse Proxy | Nginx (TLS, rate limiting, WebSocket) |
| CI/CD | GitHub Actions |
| Process Manager | PM2 (alternative to Docker) |

## Architecture

```
Internet
   ↓
Cloudflare (CDN + WAF + DDoS)
   ↓
Nginx (TLS + reverse proxy + rate limit)
   ↓
Next.js (App Router, port 3000)  ←→  Notifications (Socket.IO, port 3003)
   ↓                                    ↓
PostgreSQL (port 5432)           Redis (port 6379)
   ↓                                    ↓
BullMQ Worker (background jobs)  ←──────┘
   ↓
Payment Services (Stripe, MP, NowPayments, PayPal)
   ↓
SMM APIs (HuntSMM + future providers)
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.1+
- Node.js 20+ (for some tooling)
- Git

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/novsmm.git
cd novsmm

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env — set NEXTAUTH_SECRET, LICENSE_ENCRYPTION_KEY at minimum

# Generate Prisma client
bun run db:generate

# Create database + seed
bun run db:push
bun run prisma/seed.ts

# Start the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Admin credentials** are printed to the console when the seed runs (randomly generated — change immediately on first login).

### Production

See [docs/deployment.md](docs/deployment.md) for the complete 13-step VPS deployment guide.

```bash
# Quick production start with Docker
cp .env.example .env
# Edit .env with production values
docker compose up -d --build
docker compose exec web bun run prisma migrate deploy
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/deployment.md](docs/deployment.md) | Production VPS deployment guide (Docker + Nginx + Cloudflare) |
| [docs/architecture.md](docs/architecture.md) | System architecture, component diagram, data flow |
| [docs/security.md](docs/security.md) | Auth flow, 2FA, CSRF, rate limiting, secrets management |
| [docs/observability.md](docs/observability.md) | Health endpoints, Prometheus metrics, Sentry, alerting |
| [docs/database.md](docs/database.md) | Database schema, ERD, indexes, query patterns |
| [docs/postgresql-migration.md](docs/postgresql-migration.md) | SQLite → PostgreSQL migration guide |
| [docs/disaster-recovery.md](docs/disaster-recovery.md) | Backup strategy, restore procedures, DR drills |
| [docs/api/](docs/api/) | API reference |
| [docs/decisions/](docs/decisions/) | Architecture Decision Records (ADRs) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development setup, code style, PR process |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting, security policy |

## Project Structure

```
novsmm/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (71 routes)
│   │   ├── globals.css        # Tailwind CSS
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── novsmm/            # NOVSMM components (40+)
│   │   └── ui/                # shadcn/ui primitives
│   ├── hooks/                 # React hooks (use-api.ts, etc.)
│   ├── lib/                   # Business logic
│   │   ├── services/          # Service layer (loyalty, wallet)
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma client
│   │   ├── redis.ts           # Redis client (graceful degradation)
│   │   ├── cache.ts           # Cache layer (Redis + in-memory fallback)
│   │   ├── rate-limit.ts      # Rate limiter (Redis + in-memory)
│   │   ├── queues.ts          # BullMQ queue definitions
│   │   ├── logger.ts          # pino structured logger
│   │   ├── api-handler.ts     # withErrorHandler HOC
│   │   ├── metrics.ts         # Prometheus metrics
│   │   ├── sentry.ts          # Sentry error tracking
│   │   └── ...                # Other utilities
│   └── workers/
│       └── worker.ts          # BullMQ worker process
├── prisma/
│   ├── schema.prisma          # SQLite dev schema (with Json columns)
│   ├── schema.postgres.prisma # PostgreSQL production schema (enums, Decimal, JsonB)
│   ├── seed.ts                # Database seeder
│   ├── migrate-sqlite-to-postgres.ts  # Data migration script
│   └── backfill-lookup-hashes.ts      # API key/license lookupHash backfill
├── mini-services/
│   └── notifications-service/ # Socket.IO real-time push service
├── scripts/
│   ├── backup.sh              # PostgreSQL backup (DB + uploads + config)
│   ├── backup-uploads.sh      # File uploads backup (S3)
│   ├── restore.sh             # Database restore (interactive)
│   ├── dr-drill.sh            # Monthly DR drill (restore to temp DB + verify)
│   ├── monitor-setup.sh       # Prometheus + Grafana + AlertManager setup
│   └── pre-deploy-check.sh    # VPS pre-deployment validation
├── docs/                      # Documentation
├── public/                    # Static assets
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Production orchestration
├── nginx.conf                 # Reverse proxy config
├── .env.example               # Environment variable template
├── ecosystem.config.js        # PM2 alternative config
└── .github/workflows/ci.yml   # GitHub Actions CI/CD
```

## Development

### Scripts

```bash
bun run dev          # Start dev server (port 3000)
bun run worker       # Start BullMQ worker process
bun run lint         # Run ESLint
bun run build        # Production build (standalone)
bun run db:push      # Push schema to database
bun run db:generate  # Generate Prisma client
bun run db:migrate   # Create + apply migration
```

### Code Style

- TypeScript throughout with strict typing
- ES6+ import/export syntax
- `'use client'` / `'use server'` directives for client/server code
- shadcn/ui components preferred over custom implementations
- API routes use `withErrorHandler` HOC + `parseBody` + `audit` helpers
- Structured logging via `logger` (pino) — no `console.log` in production code
- All monetary values use `src/lib/money.ts` helpers (Float/Decimal-safe)

### Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite (dev) or PostgreSQL (prod) connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (generate with `openssl rand -hex 32`) |
| `LICENSE_ENCRYPTION_KEY` | Yes | AES-256-GCM encryption key for secrets |
| `REDIS_URL` | No | Redis connection (graceful degradation without it) |
| `GOOGLE_CLIENT_ID` / `SECRET` | No | Google OAuth credentials |
| `SENTRY_DSN` | No | Sentry error tracking DSN |

See [.env.example](.env.example) for the complete list.

## License

Proprietary. All rights reserved.

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/novsmm/issues)
- **Security**: See [SECURITY.md](SECURITY.md)
