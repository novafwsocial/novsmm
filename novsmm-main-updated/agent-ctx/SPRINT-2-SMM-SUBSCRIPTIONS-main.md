# SPRINT-2-SMM-SUBSCRIPTIONS — main (Z.ai Code)

## Task
Implement SMM Subscriptions feature (Sprint 2): auto-deliver X likes to every new post for N days. Different from the removed SaaS `Subscription` (team-seats billing). Plus internal refill endpoint, auto-refill worker, dashboard tab, and refill button on completed orders.

## Files created
- `src/app/api/subscriptions/route.ts` — GET list + POST create (atomic balance debit, publicId via nextPublicId("SUB", 1000), upfront cost = service.price × maxQuantity × posts / 1000)
- `src/app/api/subscriptions/[id]/route.ts` — GET single (ownership verified) + PATCH status (active↔paused, →cancelled only)
- `src/lib/smm-subscriptions.ts` — `checkSmmSubscriptions()` worker logic (5-min throttle, 30% simulated new-post detection, dedup via lastPostUrl, zero-charge auto-orders, completion transition)
- `src/lib/auto-refill.ts` — `autoRefillCheck()` worker logic (30-day window, 5% simulated drop detection, [AutoRefill] ticket creation, isRefill job enqueue)
- `src/app/api/orders/refill/route.ts` — internal refill endpoint (session auth, [Refill] ticket, enqueues isRefill job)
- `src/components/novsmm/dashboard-subscriptions.tsx` — new dashboard tab (stat cards, subscription cards with pause/resume/cancel, create modal with live cost estimate, empty state)

## Files modified
- `src/lib/queues.ts` — added `"smm.subscription.check"` and `"refill.autocheck"` to QueueName union, QUEUE_CONFIG (concurrency 1, maxRetries 3, backoffMs 60000), and JOB_HANDLERS
- `src/workers/worker.ts` — added the 2 new queues to HANDLERS and QUEUE_CONCURRENCY
- `src/hooks/use-api.ts` — added `useSmmSubscriptions`, `useCreateSmmSubscription`, `useUpdateSmmSubscription`, `useRefillOrder` (with proper query invalidation + toasts)
- `src/components/novsmm/app-store.ts` — added `"subscriptions"` to `DashboardTab` union (after "orders", before "wallet")
- `src/components/novsmm/dashboard-shell.tsx` — imported `CalendarClock` icon, added subscriptions to NAV array + ALL_COMMANDS (with keywords "auto", "recurring", "schedule", "subscription", "smm")
- `src/components/novsmm/app-view.tsx` — added `DashboardSubscriptions` dynamic import + `{dashboardTab === "subscriptions" && <DashboardSubscriptions />}` after orders
- `src/components/novsmm/dashboard-orders.tsx` — added `RotateCcw` icon import, `useRefillOrder` hook, Refill button in the table Actions column (only for completed orders), replaced `handleRefill` in the OrderDetailDrawer to use `useRefillOrder` with `createTicket` fallback, made the "Request refill" button conditional on `order.status === "completed"`

## Verification
- `bun run lint`: 0 errors, 1 pre-existing warning (load-test.js)
- Dev server: HTTP 200 on `/` (after Turbopack warmup)
- Endpoint smoke tests (no session):
  - `GET /api/subscriptions` → 401 ✓
  - `GET /api/subscriptions/some-id` → 401 ✓
  - `POST /api/orders/refill` → 403 CSRF (expected without Origin header) ✓
- Dev log: no compile errors related to changes (only pre-existing NextAuth NEXTAUTH_URL/NO_SECRET warnings)

## Notes
- The 4GB sandbox suffers intermittent OOM kills of next-server during heavy Turbopack compile (especially on the homepage that imports the whole dashboard). This is a sandbox limitation, not a code issue — already documented in the previous worklog. Restarting the dev server (sometimes 2-3 attempts) lets Turbopack cache intermediate state to disk, after which the homepage compiles in ~15s.
- The SMM subscription worker uses `lastCheckedAt < now - 5min` as the throttle gate; the worker handler stub is wired in both `src/lib/queues.ts` (for fallback in-process mode) and `src/workers/worker.ts` (for production Redis/BullMQ mode).
- `postsProcessed < posts` filter is applied in JS (not SQL) because Prisma doesn't support field-to-field comparisons in `where`. In practice the `status: "active"` filter already excludes completed subscriptions.
- Auto-orders created by the worker have `totalPrice=0` because the balance was already debited at subscription creation (charge for max quantity per post × posts, to be safe). The auto-order flows through the normal fulfillment pipeline via the enqueued `order.fulfill` job.
