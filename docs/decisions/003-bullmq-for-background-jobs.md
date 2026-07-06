# ADR-003: BullMQ for Background Job Processing

## Status
Accepted

## Context
Order fulfillment was running via `setTimeout` chains inside API route handlers. This caused:
1. Serverless functions killed the process when the response returned → fulfillment never completed
2. Server restarts killed in-flight timeouts → orders stuck in "processing"
3. The setTimeout delays blocked the event loop
4. No retry logic, no dead letter queue, no visibility

## Decision
Use **BullMQ** (Redis-based job queue) with a separate worker process.

**Queues defined:**
- `order.fulfill` (concurrency 5) — order fulfillment
- `email.send` (concurrency 10) — email delivery
- `ws.broadcast` (concurrency 20) — WebSocket notification push
- `provider.sync` (concurrency 1) — SMM provider catalog sync
- `loyalty.reconcile` (concurrency 3) — achievement reconciliation
- `ai.insights` (concurrency 1) — AI insight generation

Each queue: 3 retries, exponential backoff, dead letter queue, bull-board UI.

## Consequences
**Positive:**
- Jobs survive server restarts (persisted in Redis)
- Automatic retries with backoff
- Dead letter queue for failed jobs
- Visibility via bull-board UI
- Worker process can scale independently (`docker compose up --scale worker=2`)

**Negative:**
- Additional process to manage (worker)
- Redis dependency (mitigated by graceful degradation — falls back to `setImmediate` in-process)

**Fallback:** When Redis is not available, `enqueueJob()` falls back to `setImmediate(() => handler(data))` — the job runs in-process immediately. This preserves dev/sandbox functionality.
