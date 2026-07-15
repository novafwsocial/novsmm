/**
 * Wallet Withdraw — Race Condition Test
 *
 * Tests that concurrent withdrawal requests cannot drive the balance
 * negative. The withdraw route uses a conditional updateMany inside a
 * $transaction to ensure atomicity.
 *
 * Related: W-1 (webhook double-credit fix), H-7 (withdraw race fix)
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db, createTestUser, cleanupTestData } from "./setup";

describe("Wallet Withdraw — Race Condition", () => {
  let user: { id: string; balance: number };

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({
      email: "wallet-race@novsmm.test",
      balance: 100, // Start with $100
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await db.$disconnect();
  });

  it("should not allow two concurrent withdrawals to drain more than the balance", async () => {
    // Simulate two concurrent $60 withdrawals (total $120 > $100 balance)
    // Only one should succeed, the other should fail with INSUFFICIENT_BALANCE

    const withdrawAmount = 60;
    const userId = user.id;

    // Replicate the withdraw logic from src/app/api/wallet/withdraw/route.ts
    const simulateWithdraw = async (label: string) => {
      try {
        const result = await db.$transaction(async (tx) => {
          const updated = await tx.user.updateMany({
            where: { id: userId, balance: { gte: withdrawAmount } },
            data: { balance: { decrement: withdrawAmount } },
          });
          if (updated.count === 0) {
            return { success: false, label, reason: "INSUFFICIENT_BALANCE" };
          }
          await tx.transaction.create({
            data: {
              publicId: `TX-WD-${label}-${Date.now()}`,
              userId,
              type: "withdrawal",
              amount: -withdrawAmount,
              description: `Withdrawal ${label}`,
              status: "pending",
              method: "test",
              reference: `wd_${label}_${Date.now()}`,
            },
          });
          return { success: true, label };
        });
        return result;
      } catch (e: any) {
        return { success: false, label, reason: e.message };
      }
    };

    // Run both concurrently
    const [result1, result2] = await Promise.all([
      simulateWithdraw("A"),
      simulateWithdraw("B"),
    ]);

    // Verify results
    const finalUser = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    const successCount = [result1, result2].filter((r) => r.success).length;

    expect(successCount).toBe(1);
    expect(finalUser?.balance).toBe(40); // 100 - 60 = 40

    // Verify exactly one transaction was created
    const transactions = await db.transaction.findMany({
      where: { userId, type: "withdrawal" },
    });
    expect(transactions.length).toBe(1);
  });

  it("should handle 10 concurrent withdrawals correctly", async () => {
    // 10 concurrent $20 withdrawals = $200 total, but balance is only $100
    // Should succeed at most 5 times (5 × $20 = $100)
    // NOTE: SQLite serializes writes more aggressively than PostgreSQL,
    // so fewer may succeed. The key assertion is: balance never goes
    // negative and total debited == successes × $20.

    const withdrawAmount = 20;
    const userId = user.id;

    const simulateWithdraw = async (label: string) => {
      try {
        const result = await db.$transaction(async (tx) => {
          const updated = await tx.user.updateMany({
            where: { id: userId, balance: { gte: withdrawAmount } },
            data: { balance: { decrement: withdrawAmount } },
          });
          if (updated.count === 0) return { success: false };
          await tx.transaction.create({
            data: {
              publicId: `TX-WD-${label}-${Date.now()}`,
              userId,
              type: "withdrawal",
              amount: -withdrawAmount,
              description: `Withdrawal ${label}`,
              status: "pending",
              method: "test",
              reference: `wd_${label}_${Date.now()}`,
            },
          });
          return { success: true };
        });
        return result;
      } catch {
        return { success: false };
      }
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => simulateWithdraw(`W${i}`))
    );

    const finalUser = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    const successCount = results.filter((r) => r.success).length;

    // At most 5 should succeed (can't withdraw more than $100 at $20 each)
    expect(successCount).toBeLessThanOrEqual(5);
    // Balance should never go negative
    expect(finalUser?.balance).toBeGreaterThanOrEqual(0);
    // Balance should equal 100 - (successes × 20)
    expect(finalUser?.balance).toBe(100 - successCount * 20);
    // At least some should succeed (sanity check)
    expect(successCount).toBeGreaterThan(0);
  });

  it("should reject withdrawal when balance is 0", async () => {
    // Set balance to 0
    await db.user.update({ where: { id: user.id }, data: { balance: 0 } });

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: user.id, balance: { gte: 50 } },
        data: { balance: { decrement: 50 } },
      });
      return updated.count;
    });

    expect(result).toBe(0); // No rows updated — balance check failed
  });
});
