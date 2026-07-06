import Redis from "ioredis";

/**
 * Redis singleton client with graceful degradation.
 *
 * DESIGN: The entire Redis integration is designed to work WITHOUT Redis
 * being available. When Redis is not configured (REDIS_URL not set) or
 * unreachable, all cache/rate-limit/queue operations fall back to in-memory
 * equivalents. This allows the app to run in the sandbox (no Redis) and
 * automatically upgrade to Redis when provisioned (Phase 8 Docker).
 *
 * In production, set REDIS_URL=redis://localhost:6379 in .env to enable
 * Redis-backed caching, rate limiting, and BullMQ queues.
 *
 * Connection is lazy — the first actual operation triggers a connection
 * attempt. If it fails, `isRedisAvailable()` returns false and all
 * consumers fall back to in-memory mode.
 */

let redisClient: Redis | null = null;
let connectionAttempted = false;
let isAvailable = false;

/**
 * Get the Redis client instance (or null if Redis is not configured).
 * Does NOT attempt a connection — use `getConnectedRedis()` for that.
 */
function getClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 3) {
          // Stop retrying after 3 attempts — mark as unavailable
          return null;
        }
        return Math.min(times * 200, 1000);
      },
      reconnectOnError: (err) => {
        // Reconnect on READONLY errors (Redis failover)
        return err.message.includes("READONLY");
      },
    });

    redisClient.on("error", (err) => {
      if (!isAvailable) {
        // Only log once during initial connection failure
        console.error("[redis] Connection failed — falling back to in-memory mode:", err.message);
      }
      isAvailable = false;
    });

    redisClient.on("connect", () => {
      console.log("[redis] Connected — Redis-backed caching/rate-limiting/queues active");
    });

    redisClient.on("ready", () => {
      isAvailable = true;
      connectionAttempted = true;
    });

    redisClient.on("close", () => {
      isAvailable = false;
    });
  } catch (e) {
    console.error("[redis] Failed to create client:", e);
    return null;
  }

  return redisClient;
}

/**
 * Get a connected Redis client, or null if Redis is not available.
 * Triggers a connection attempt on first call.
 */
export async function getRedis(): Promise<Redis | null> {
  const client = getClient();
  if (!client) return null;

  if (!connectionAttempted) {
    // Give it a short window to connect on first use
    try {
      await client.ping();
      isAvailable = true;
    } catch {
      isAvailable = false;
    }
    connectionAttempted = true;
  }

  return isAvailable ? client : null;
}

/**
 * Check if Redis is currently available and connected.
 * Non-blocking — returns the last known state.
 */
export function isRedisAvailable(): boolean {
  return isAvailable && redisClient !== null;
}

/**
 * Execute a Redis operation with automatic fallback.
 * If Redis is not available, returns null (caller handles fallback).
 */
export async function withRedis<T>(
  fn: (client: Redis) => Promise<T>
): Promise<T | null> {
  const client = await getRedis();
  if (!client) return null;
  try {
    return await fn(client);
  } catch (e) {
    // Connection error — mark unavailable and return null for fallback
    isAvailable = false;
    return null;
  }
}

/**
 * Graceful shutdown — close the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isAvailable = false;
  }
}
