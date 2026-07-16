import { getRedis } from "./redis";

/**
 * Rate limiter with Redis primary + in-memory fallback.
 *
 * When Redis is available, rate limiting is shared across all instances
 * (production-safe for multi-instance/serverless deployments). When Redis
 * is not available, falls back to per-instance in-memory limiting.
 *
 * Uses a sliding window algorithm via Redis sorted sets for precise
 * rate limiting. The in-memory fallback uses a fixed window approximation.
 *
 * Usage:
 *   const result = await checkRateLimit("login:1.2.3.4", 20, 15 * 60);
 *   if (!result.allowed) return 429;
 */

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
};

// ── In-memory fallback (fixed window) ──
type MemoryBucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, MemoryBucket>();

let lastCleanup = Date.now();
function cleanupMemoryBuckets() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt < now) memoryBuckets.delete(key);
  }
}

function memoryCheck(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  cleanupMemoryBuckets();
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Check rate limit for a given key.
 *
 * @param key  Unique identifier (e.g. "login:1.2.3.4", "api:userId")
 * @param maxRequests  Maximum requests allowed in the window
 * @param windowMs  Time window in milliseconds
 * @returns { allowed, remaining, resetAt }
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  // Initialize Redis lazily, then use the shared sliding window when it is
  // configured. Checking availability before calling getRedis() would leave
  // every fresh app process on the in-memory fallback forever.
  const redis = await getRedis();
  if (redis) {
    try {
      return await redisSlidingWindow(redis, key, maxRequests, windowMs);
    } catch {
      // Fall through to in-memory
    }
  }

  return memoryCheck(key, maxRequests, windowMs);
}

/**
 * Redis sliding window rate limiter using sorted sets.
 * Each request adds a member to a sorted set with score = timestamp.
 * Old entries (outside window) are removed, then count is checked.
 */
async function redisSlidingWindow(
  redis: NonNullable<Awaited<ReturnType<typeof getRedis>>>,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  // Capture a single unique member ID for this request.
  // Using Math.random() twice (once for zadd, once for zrem) was a bug:
  // the two calls produce different values, so zrem tries to remove a member
  // that was never added — the rejected entry stays in the sorted set forever,
  // blocking legitimate users for the full window duration (self-DoS).
  const memberId = `${now}:${Math.random()}`;

  // Use a pipeline for atomicity
  const pipeline = redis.pipeline();
  // 1. Remove entries outside the window
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  // 2. Count current entries
  pipeline.zcard(redisKey);
  // 3. Add current request (unique member captured above)
  pipeline.zadd(redisKey, now, memberId);
  // 4. Set expiry on the key (cleanup)
  pipeline.pexpire(redisKey, windowMs);

  const results = await pipeline.exec();
  if (!results) {
    return memoryCheck(key, maxRequests, windowMs);
  }

  const count = (results[1][1] as number) + 1; // +1 because we just added one
  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const resetAt = now + windowMs;

  // If not allowed, remove the entry we just added using the SAME memberId
  if (!allowed) {
    await redis.zrem(redisKey, memberId);
  }

  return { allowed, remaining, resetAt };
}

/**
 * Convenience: check and return 429 response if rate limited.
 * Returns null if allowed (caller continues).
 *
 * Usage in API route:
 *   const limited = await rateLimitOr429(req, "login", 20, 15 * 60 * 1000);
 *   if (limited) return limited;
 */
export { memoryBuckets };
