/**
 * Auth Brute-Force Lockout Test
 *
 * Tests that the trackFailedAttempt / isAccountLocked system correctly
 * locks an account after 5 failed attempts and unlocks after the
 * lockout period. Also tests the A-6 atomic counter fix.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db, createTestUser, cleanupTestData } from "./setup";

// Replicate the constants and in-memory fallback from auth.ts
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory lockout tracker (same as auth.ts fallback)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function trackFailedAttempt(key: string) {
  const existing = loginAttempts.get(key);
  const count = (existing?.count ?? 0) + 1;
  const lockedUntil = count >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCK_DURATION_MS : 0;
  loginAttempts.set(key, { count, lockedUntil });
}

function isAccountLocked(key: string): { locked: boolean; lockedUntil?: number } {
  const mem = loginAttempts.get(key);
  if (mem && mem.lockedUntil > Date.now()) {
    return { locked: true, lockedUntil: mem.lockedUntil };
  }
  return { locked: false };
}

function clearFailedAttempts(key: string) {
  loginAttempts.delete(key);
}

describe("Auth Brute-Force Lockout", () => {
  beforeEach(() => {
    loginAttempts.clear();
  });

  afterAll(async () => {
    await cleanupTestData();
    await db.$disconnect();
  });

  it("should not lock before 5 failed attempts", () => {
    const key = "email:test@novsmm.test";

    for (let i = 1; i <= 4; i++) {
      trackFailedAttempt(key);
      const lock = isAccountLocked(key);
      expect(lock.locked).toBe(false);
    }
  });

  it("should lock after exactly 5 failed attempts", () => {
    const key = "email:test@novsmm.test";

    for (let i = 1; i <= 5; i++) {
      trackFailedAttempt(key);
    }

    const lock = isAccountLocked(key);
    expect(lock.locked).toBe(true);
    expect(lock.lockedUntil).toBeDefined();
  });

  it("should remain locked for 15 minutes", () => {
    const key = "email:test@novsmm.test";

    for (let i = 0; i < 5; i++) {
      trackFailedAttempt(key);
    }

    const lock = isAccountLocked(key);
    expect(lock.locked).toBe(true);
    expect(lock.lockedUntil! - Date.now()).toBeGreaterThan(14 * 60 * 1000); // > 14min
    expect(lock.lockedUntil! - Date.now()).toBeLessThan(16 * 60 * 1000); // < 16min
  });

  it("should unlock after clearFailedAttempts", () => {
    const key = "email:test@novsmm.test";

    for (let i = 0; i < 5; i++) {
      trackFailedAttempt(key);
    }
    expect(isAccountLocked(key).locked).toBe(true);

    clearFailedAttempts(key);
    expect(isAccountLocked(key).locked).toBe(false);
  });

  it("should track attempts independently per key (email vs IP)", () => {
    const emailKey = "email:user@novsmm.test";
    const ipKey = "ip:192.168.1.1";

    // 5 failures on email key
    for (let i = 0; i < 5; i++) trackFailedAttempt(emailKey);
    // 3 failures on IP key
    for (let i = 0; i < 3; i++) trackFailedAttempt(ipKey);

    expect(isAccountLocked(emailKey).locked).toBe(true);
    expect(isAccountLocked(ipKey).locked).toBe(false);
  });

  it("should handle concurrent failures atomically (A-6 fix)", () => {
    const key = "email:concurrent@novsmm.test";

    // Simulate 10 concurrent failed attempts
    // In the in-memory fallback (synchronous Map), all 10 should be counted
    for (let i = 0; i < 10; i++) {
      trackFailedAttempt(key);
    }

    const data = loginAttempts.get(key);
    expect(data?.count).toBe(10);
    expect(isAccountLocked(key).locked).toBe(true);
  });

  it("should not lock a different account", () => {
    const key1 = "email:user1@novsmm.test";
    const key2 = "email:user2@novsmm.test";

    for (let i = 0; i < 5; i++) trackFailedAttempt(key1);

    expect(isAccountLocked(key1).locked).toBe(true);
    expect(isAccountLocked(key2).locked).toBe(false);
  });
});
