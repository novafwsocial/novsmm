# ADR-006: Graceful Degradation when Redis is Unavailable

## Status
Accepted

## Context
Redis is not available in the development sandbox or during local development. The platform needed to work WITHOUT Redis while automatically upgrading to Redis-backed when available.

## Decision
All Redis-dependent operations have **in-memory fallbacks**:
- `src/lib/redis.ts` — singleton client with `isRedisAvailable()` check
- `src/lib/cache.ts` — falls back to in-memory `Map`
- `src/lib/rate-limit.ts` — falls back to in-memory fixed-window
- `src/lib/auth.ts` — brute-force tracker falls back to in-memory `Map`
- `src/lib/queues.ts` — `enqueueJob()` falls back to `setImmediate(() => handler(data))`
- `mini-services/notifications-service/` — runs single-instance without Redis adapter

## Consequences
**Positive:**
- Dev/sandbox works without Redis (zero setup)
- Code is the same for dev and production
- Automatic upgrade when Redis is provisioned
- No feature flags or conditional code in business logic

**Negative:**
- In-memory fallback is per-instance (not shared across instances)
- In-memory fallback is lost on restart
- Rate limiting is less precise (fixed-window vs. sliding-window)

**Production requirement:** Set `REDIS_URL=redis://redis:6379` in `.env` when deploying with Docker. All operations automatically switch to Redis-backed.
