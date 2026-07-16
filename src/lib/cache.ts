import { getRedis } from "./redis";

/**
 * Cache layer with Redis primary + in-memory fallback.
 *
 * When Redis is available, all cache operations use Redis (shared across
 * instances, survives restarts). When Redis is not available, operations
 * fall back to an in-memory Map (per-instance, lost on restart).
 *
 * Cache keys should follow the pattern: `namespace:identifier`
 * Examples:
 *   - public:settings
 *   - public:currencies
 *   - user:{id}
 *   - services:{hash}
 *   - loyalty:{userId}
 *   - admin:overview
 *
 * Invalidation: use cacheDel(key) for single keys, cacheInvalidate(pattern)
 * for pattern-based invalidation (e.g. "user:*" clears all user cache entries).
 */

// ── In-memory fallback store ──
const memoryCache = new Map<string, { value: string; expiresAt: number | null }>();

function memoryGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds?: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

function memoryDel(key: string): void {
  memoryCache.delete(key);
}

function memoryInvalidate(pattern: string): void {
  // Convert glob pattern to regex (* → .*)
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) memoryCache.delete(key);
  }
}

/**
 * Get a cached value by key.
 * Returns null if not found or expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // Initialize Redis lazily before falling back to the per-process cache.
  const redis = await getRedis();
  if (redis) {
    const value = await redis.get(key);
    if (value !== null && value !== undefined) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    }
    return null;
  }

  // Fallback to in-memory
  const memValue = memoryGet(key);
  if (memValue !== null) {
    try {
      return JSON.parse(memValue) as T;
    } catch {
      return memValue as unknown as T;
    }
  }
  return null;
}

/**
 * Set a cached value with optional TTL (in seconds).
 * If TTL is not provided, the value persists until invalidated.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);

  const redis = await getRedis();
  if (redis) {
    if (ttlSeconds) {
      await redis.set(key, serialized, "EX", ttlSeconds);
    } else {
      await redis.set(key, serialized);
    }
    return;
  }

  memorySet(key, serialized, ttlSeconds);
}

/**
 * Delete a single cache key.
 */
export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryDel(key);
}

/**
 * Invalidate all keys matching a glob pattern.
 * Example: cacheInvalidate("user:*") clears all user cache entries.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    // SCAN is non-blocking (unlike KEYS), safe for production
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
    return;
  }
  memoryInvalidate(pattern);
}

/**
 * Get or set pattern — fetches from cache, or calls the factory function,
 * caches the result, and returns it.
 *
 * Usage:
 *   const settings = await cacheGetOrSet("public:settings", 60, async () => {
 *     return await db.setting.findMany();
 *   });
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await factory();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
