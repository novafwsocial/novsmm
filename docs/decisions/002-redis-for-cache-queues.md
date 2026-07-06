# ADR-002: Redis for Cache, Rate Limiting, and Queues

## Status
Accepted

## Context
The platform needed:
1. **Cache** — NextAuth jwt callback was hitting the DB on every authenticated request (#1 DB hot spot)
2. **Rate limiting** — In-memory rate limiter didn't work across multiple instances
3. **Brute-force tracking** — In-memory lockout was lost on restart and not shared across instances
4. **Background queues** — `setTimeout` in API routes died on serverless cold start

## Decision
Use **Redis 7** as the single infrastructure component for all four use cases:
- Cache (user data, public settings, service catalog)
- Rate limiting (sliding window via sorted sets)
- Brute-force tracking (login_lock:{email} with TTL)
- BullMQ queues (order fulfillment, emails, WebSocket broadcast)

## Consequences
**Positive:**
- Single infrastructure dependency (Redis)
- Shared state across all instances
- Survives restarts (persistent)
- Well-supported by Node.js ecosystem (ioredis, BullMQ)

**Negative:**
- Additional infrastructure to manage
- Network latency for cache lookups (mitigated by in-memory fallback)

**Graceful degradation:** When Redis is not available (dev/sandbox), all operations fall back to in-memory equivalents. See [ADR-006](006-graceful-degradation.md).
