/**
 * Webhook Idempotency — W-1 Race Condition Fix Test
 *
 * Tests that two concurrent webhook callbacks for the SAME pending
 * transaction cannot double-credit the user's wallet. The fix uses
 * a conditional updateMany with status:"pending" inside a $transaction.
 *
 * Before the fix: both webhooks passed the "if (status === completed)"
 * check outside the transaction, then both incremented the balance.
 * After the fix: only one webhook can flip the status (the other gets
 * count=0 and aborts before crediting).
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db, createTestUser, cleanupTestData } from "./setup";

describe("Webhook Idempotency — W-1 Fix", () => {
  let user: { id: string; balance: number };
  let txn: { id: string; publicId: string; amount: number };

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({
      email: "webhook-test@novsmm.test",
      balance: 0,
    });
    txn = await db.transaction.create({
      data: {
        publicId: "TX-WEBHOOK-001",
        userId: user.id,
        type: "topup",
        amount: 50.0,
        description: "Test topup via PayPal",
        status: "pending",
        method: "paypal",
        reference: "paypal:test-capture-001",
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await db.$disconnect();
  });

  it("should credit exactly once when two webhooks arrive concurrently", async () => {
    // Simulate the FIXED webhook handler logic (from paypal/route.ts)
    const simulateWebhookCredit = async () => {
      return db.$transaction(async (tx) => {
        const updated = await tx.transaction.updateMany({
          where: { id: txn.id, status: "pending" },
          data: {
            status: "completed",
            reference: "paypal:test-capture-001",
            description: "Top-up via PayPal — capture test-capture-001",
          },
        });
        if (updated.count === 0) {
          return { alreadyProcessed: true };
        }
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: txn.amount },
            lifetimeEarnings: { increment: txn.amount },
          },
        });
        return { alreadyProcessed: false };
      });
    };

    // Two concurrent webhooks for the same transaction
    const [result1, result2] = await Promise.all([
      simulateWebhookCredit(),
      simulateWebhookCredit(),
    ]);

    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { balance: true, lifetimeEarnings: true },
    });
    const finalTxn = await db.transaction.findUnique({
      where: { id: txn.id },
      select: { status: true },
    });

    // Exactly one webhook should have credited
    const credits = [result1, result2].filter((r) => !r.alreadyProcessed).length;
    expect(credits).toBe(1);
    expect(finalUser?.balance).toBe(50);
    expect(finalUser?.lifetimeEarnings).toBe(50);
    expect(finalTxn?.status).toBe("completed");
  });

  it("should be idempotent when webhooks arrive sequentially (retry)", async () => {
    // First webhook — should credit
    const creditOnce = async () => {
      return db.$transaction(async (tx) => {
        const updated = await tx.transaction.updateMany({
          where: { id: txn.id, status: "pending" },
          data: { status: "completed" },
        });
        if (updated.count === 0) return { alreadyProcessed: true };
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: txn.amount } },
        });
        return { alreadyProcessed: false };
      });
    };

    const first = await creditOnce();
    const second = await creditOnce();
    const third = await creditOnce(); // PayPal retry

    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { balance: true },
    });

    expect(first.alreadyProcessed).toBe(false);
    expect(second.alreadyProcessed).toBe(true);
    expect(third.alreadyProcessed).toBe(true);
    expect(finalUser?.balance).toBe(50); // Only credited once
  });

  it("should handle refund idempotency (no double-debit)", async () => {
    // Mark transaction as completed first (simulating a prior credit)
    await db.transaction.update({
      where: { id: txn.id },
      data: { status: "completed" },
    });
    await db.user.update({
      where: { id: user.id },
      data: { balance: { increment: 50 }, lifetimeEarnings: { increment: 50 } },
    });

    // Simulate the FIXED refund logic (from nowpayments/route.ts)
    const simulateRefund = async () => {
      return db.$transaction(async (tx) => {
        const updated = await tx.transaction.updateMany({
          where: { id: txn.id, status: "completed" },
          data: { status: "refunded" },
        });
        if (updated.count === 0) return { alreadyProcessed: true };
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { decrement: txn.amount },
            lifetimeEarnings: { decrement: txn.amount },
          },
        });
        return { alreadyProcessed: false };
      });
    };

    // Two concurrent refund webhooks
    const [result1, result2] = await Promise.all([
      simulateRefund(),
      simulateRefund(),
    ]);

    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { balance: true },
    });

    const refunds = [result1, result2].filter((r) => !r.alreadyProcessed).length;
    expect(refunds).toBe(1);
    expect(finalUser?.balance).toBe(0); // 50 - 50 = 0, not -50
  });
});
