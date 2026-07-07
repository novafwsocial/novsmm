import { Worker } from "bullmq";
import { getRedis } from "../lib/redis";
import type { QueueName } from "../lib/queues";

/**
 * BullMQ Worker Process — runs separately from the Next.js app.
 *
 * Start with: `bun run worker` (see package.json script)
 *
 * This process connects to Redis and processes jobs from all queues.
 * If Redis is not available, it exits gracefully with a message.
 *
 * Job handlers are imported from the queue definitions. Each handler:
 *   1. Receives the job data
 *   2. Performs the work (DB operations, API calls, etc.)
 *   3. Throws on failure (BullMQ retries with exponential backoff)
 *   4. Returns a result (stored in the job)
 *
 * Concurrency is configured per-queue in src/lib/queues.ts.
 */

// Lazy-load handlers to avoid circular deps
const HANDLERS: Record<QueueName, (data: any) => Promise<any>> = {
  "order.fulfill": async (data) => {
    const { simulateFulfillment } = await import("../lib/orders");
    await simulateFulfillment(data.orderId, data.userId);
    return { fulfilled: true };
  },
  "email.send": async (data) => {
    const { sendEmail } = await import("../lib/notify");
    return await sendEmail(data);
  },
  "ws.broadcast": async (data) => {
    const { broadcastToWs } = await import("../lib/notify");
    await broadcastToWs(data);
    return { broadcast: true };
  },
  "provider.sync": async (data) => {
    console.log("[worker:provider.sync] Syncing provider:", data.providerId);
    // Full implementation in Phase 5
    return { synced: true };
  },
  "loyalty.reconcile": async (data) => {
    const { reconcileAchievements } = await import(
      "../app/api/me/loyalty/route"
    );
    await reconcileAchievements(data.userId);
    return { reconciled: true };
  },
  "ai.insights": async (data) => {
    console.log("[worker:ai.insights] Generating insights for user:", data.userId);
    // Full implementation in Phase 5
    return { generated: true };
  },
  "smm.subscription.check": async (_data) => {
    const { checkSmmSubscriptions } = await import("../lib/smm-subscriptions");
    const result = await checkSmmSubscriptions();
    return result;
  },
  "refill.autocheck": async (_data) => {
    const { autoRefillCheck } = await import("../lib/auto-refill");
    const result = await autoRefillCheck();
    return result;
  },
};

const QUEUE_CONCURRENCY: Record<QueueName, number> = {
  "order.fulfill": 5,
  "email.send": 10,
  "ws.broadcast": 20,
  "provider.sync": 1,
  "loyalty.reconcile": 3,
  "ai.insights": 1,
  "smm.subscription.check": 1,
  "refill.autocheck": 1,
};

async function main() {
  console.log("🔧 NOVSMM Worker Process — starting...");

  // Check Redis availability
  const redis = await getRedis();
  if (!redis) {
    console.error(
      "❌ Redis is not available. The worker process requires Redis to function.\n" +
        "   Set REDIS_URL in .env and ensure Redis is running.\n" +
        "   In the meantime, jobs will run in-process via the fallback in enqueueJob()."
    );
    process.exit(0); // Exit gracefully — the app's fallback handles jobs
  }

  console.log("✅ Connected to Redis — starting workers for all queues");

  // Create a worker for each queue
  const workers: Worker[] = [];

  for (const queueName of Object.keys(HANDLERS) as QueueName[]) {
    const handler = HANDLERS[queueName];
    const concurrency = QUEUE_CONCURRENCY[queueName];

    const worker = new Worker(
      queueName,
      async (job) => {
        console.log(
          `[${queueName}] Processing job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 1})`
        );
        const result = await handler(job.data);
        console.log(`[${queueName}] Job ${job.id} completed`);
        return result;
      },
      {
        connection: redis.duplicate(),
        concurrency,
      }
    );

    worker.on("failed", (job, err) => {
      console.error(
        `[${queueName}] Job ${job?.id} FAILED after ${job?.attemptsMade} attempts:`,
        err.message
      );
    });

    worker.on("error", (err) => {
      console.error(`[${queueName}] Worker error:`, err);
    });

    workers.push(worker);
    console.log(`  ✓ ${queueName} (concurrency: ${concurrency})`);
  }

  console.log(`\n🚀 ${workers.length} workers running. Waiting for jobs...\n`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down workers...`);
    await Promise.all(workers.map((w) => w.close()));
    const { closeRedis } = await import("../lib/redis");
    await closeRedis();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Fatal worker error:", err);
  process.exit(1);
});
