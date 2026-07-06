# Architecture Decision Records (ADRs)

This directory contains ADRs for NOVSMM — documented decisions that shaped the platform's architecture.

## What is an ADR?

An ADR captures **why** a decision was made, not just **what** was decided. Each ADR includes:
- **Context** — the problem being solved
- **Decision** — what was chosen
- **Consequences** — trade-offs and implications

## ADR Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](001-postgresql-over-sqlite.md) | Use PostgreSQL for production (SQLite for dev) | Accepted |
| [ADR-002](002-redis-for-cache-queues.md) | Use Redis for cache, rate limiting, and queues | Accepted |
| [ADR-003](003-bullmq-for-background-jobs.md) | Use BullMQ for background job processing | Accepted |
| [ADR-004](004-nginx-over-caddy.md) | Use Nginx instead of Caddy for production | Accepted |
| [ADR-005](005-docker-compose-over-k8s.md) | Use Docker Compose instead of Kubernetes | Accepted |
| [ADR-006](006-graceful-degradation.md) | Graceful degradation when Redis is unavailable | Accepted |
| [ADR-007](007-sequence-table-for-ids.md) | Sequence table for atomic public ID generation | Accepted |
| [ADR-008](008-lookup-hash-for-keys.md) | SHA-256 lookupHash for O(1) API key + license validation | Accepted |
