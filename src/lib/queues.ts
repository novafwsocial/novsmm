import { Queue, QueueEvents } from "bullmq";
import { getRedis } from "./redis";

/**
 * BullMQ queue definitions for background job processing.
 *
 * DESIGN: When Redis is available, jobs are enqueued to BullMQ queues and
 * processed by a separate worker process (`src/workers/worker.ts`). When
 * Redis is NOT available, `enqueueJob()` falls back to running the job
 * synchronously in-process (preserving the current setTimeout behavior).
 *
 * This allows the app to run in the sandbox (no Redis, no worker) and
 * automatically upgrade to background processing when Redis is provisioned.
 *
 * Queue architecture:
 *   - order.fulfill           → Order fulfillment (was setTimeout in API routes)
 *   - email.send              → Email delivery (was synchronous in notify.ts)
 *   - ws.broadcast            → WebSocket broadcast (was HTTP POST to mini-service)
 *   - provider.sync           → Provider catalog sync (was manual CLI script)
 *   - loyalty.reconcile       → Achievement reconciliation (was synchronous in API)
 *   - ai.insights             → AI insights generation (was synchronous in API)
 *   - smm.subscription.check  → Poll active SMM subscriptions for new posts and
 *                               auto-create orders for each new post detected.
 *   - refill.autocheck        → Periodically check completed orders for delivery
 *                               drops and auto-request refills (anti-drop).
 *
 * Each queue has: retries (3), exponential backoff, DLQ, concurrency limit.
 */

export type QueueName =
  | "order.fulfill"
  | "email.send"
  | "ws.broadcast"
  | "provider.sync"
  | "loyalty.reconcile"
  | "ai.insights"
  | "smm.subscription.check"
  | "refill.autocheck";

const QUEUE_CONFIG: Record<
  QueueName,
  { concurrency: number; maxRetries: number; backoffMs: number }
> = {
  "order.fulfill": { concurrency: 5, maxRetries: 3, backoffMs: 5000 },
  "email.send": { concurrency: 10, maxRetries: 3, backoffMs: 10000 },
  "ws.broadcast": { concurrency: 20, maxRetries: 2, backoffMs: 1000 },
  "provider.sync": { concurrency: 1, maxRetries: 2, backoffMs: 30000 },
  "loyalty.reconcile": { concurrency: 3, maxRetries: 3, backoffMs: 2000 },
  "ai.insights": { concurrency: 1, maxRetries: 2, backoffMs: 30000 },
  "smm.subscription.check": { concurrency: 1, maxRetries: 3, backoffMs: 60000 },
  "refill.autocheck": { concurrency: 1, maxRetries: 3, backoffMs: 60000 },
};

// Cache queue instances
const queueCache = new Map<QueueName, Queue>();

/**
 * Get a BullMQ Queue instance (or null if Redis is not available).
 */
export async function getQueue(name: QueueName): Promise<Queue | null> {
  if (queueCache.has(name)) return queueCache.get(name)!;

  const connection = await getRedis();
  if (!connection) return null;

  const queue = new Queue(name, {
    connection: connection.duplicate() as any,
    defaultJobOptions: {
      attempts: QUEUE_CONFIG[name].maxRetries,
      backoff: {
        type: "exponential",
        delay: QUEUE_CONFIG[name].backoffMs,
      },
      removeOnComplete: { count: 100 }, // keep last 100 completed
      removeOnFail: { count: 50 }, // keep last 50 failed for debugging
    },
  });

  queueCache.set(name, queue);
  return queue;
}

/**
 * Enqueue a background job.
 *
 * If Redis is available, the job is added to a BullMQ queue and processed
 * by the worker process. If Redis is NOT available, the job runs
 * synchronously in-process (fallback for sandbox/dev mode).
 *
 * Usage:
 *   await enqueueJob("order.fulfill", { orderId, userId });
 *   await enqueueJob("email.send", { to, subject, text });
 */
export async function enqueueJob(
  name: QueueName,
  data: any,
  options?: { delay?: number; priority?: number }
): Promise<void> {
  const queue = await getQueue(name);

  if (queue) {
    // ── Redis available: enqueue to BullMQ ──
    await queue.add(name, data, {
      delay: options?.delay,
      priority: options?.priority,
    });
    return;
  }

  // ── Fallback: run in-process with setTimeout (sandbox/dev mode) ──
  // This preserves the current behavior when Redis is not available.
  // The job runs asynchronously after the current request completes.
  const handler = JOB_HANDLERS[name];
  if (handler) {
    if (options?.delay) {
      setTimeout(() => handler(data).catch(console.error), options.delay);
    } else {
      setImmediate(() => handler(data).catch(console.error));
    }
  }
}

/**
 * Job handler registry.
 *
 * In production (with Redis), these are imported by the worker process.
 * In fallback mode (no Redis), they're called in-process via enqueueJob().
 *
 * Handlers are loaded lazily to avoid circular dependencies during module
 * initialization.
 */
const JOB_HANDLERS: Record<QueueName, (data: any) => Promise<void>> = {
  "order.fulfill": async (data) => {
    const { simulateFulfillment } = await import("./orders");
    await simulateFulfillment(data.orderId, data.userId);
  },
  "email.send": async (data) => {
    const { sendEmail } = await import("./notify");
    await sendEmail(data);
  },
  "ws.broadcast": async (data) => {
    const { broadcastToWs } = await import("./notify");
    await broadcastToWs(data);
  },
  "provider.sync": async (data) => {
    // Phase 3: stub — full implementation in Phase 5
    console.log("[queue:provider.sync] Syncing provider:", data.providerId);
  },
  "loyalty.reconcile": async (data) => {
    const { reconcileAchievements } = await import("./services/loyalty.service");
    await reconcileAchievements(data.userId);
  },
  "ai.insights": async (data) => {
    // Phase 3: stub — full implementation in Phase 5
    console.log("[queue:ai.insights] Generating insights for user:", data.userId);
  },
  "smm.subscription.check": async (_data) => {
    const { checkSmmSubscriptions } = await import("./smm-subscriptions");
    await checkSmmSubscriptions();
  },
  "refill.autocheck": async (_data) => {
    const { autoRefillCheck } = await import("./auto-refill");
    await autoRefillCheck();
  },
};

/**
 * Get job counts for a queue (for admin dashboard / bull-board).
 */
export async function getQueueStats(name: QueueName) {
  const queue = await getQueue(name);
  if (!queue) return null;

  const counts = await queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed"
  );
  return counts;
}

/**
 * Close all queue connections (for graceful shutdown).
 */
export async function closeQueues(): Promise<void> {
  for (const queue of queueCache.values()) {
    await queue.close();
  }
  queueCache.clear();
}
