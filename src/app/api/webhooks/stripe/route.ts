import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, apiError, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import {
  verifyStripeWebhook,
  resolveStripeWebhookSecret,
} from "@/lib/stripe";
import { nextPublicId } from "@/lib/ids";

/**
 * POST /api/webhooks/stripe — Stripe webhook handler.
 *
 * Handles:
 *   - payment_intent.succeeded      → credit wallet (existing top-up flow)
 *   - payment_intent.payment_failed → mark txn failed
 *   - charge.refunded               → reverse credit
 *   - checkout.session.completed    → wallet top-up (one-time payment mode)
 *   - invoice.payment_succeeded     → record Transaction (topup) + notification
 *   - invoice.payment_failed        → notification warning
 *
 * All handlers are idempotent — they check for existing records before creating.
 *
 * Webhook secret source:
 *   1. STRIPE_WEBHOOK_SECRET env var
 *   2. Setting `stripe.webhookSecret` (DB, admin-configurable)
 *
 * SECURITY: The handler is fail-closed. Without a configured secret AND a signature,
 * the webhook is REJECTED with 401 — it is NOT processed in "log mode" anymore.
 * The previous "log mode" allowed anyone to POST fake Stripe events and get free
 * wallet top-ups.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: any;

  // Resolve the webhook secret (env var → Setting table)
  const webhookSecret = await resolveStripeWebhookSecret();

  // ── Fail-closed: require both secret AND signature ──
  if (!webhookSecret) {
    // Log the rejected event for audit, but DO NOT process it
    try {
      event = JSON.parse(body);
    } catch {
      return apiError("Invalid JSON", 400);
    }
    await db.webhookLog.create({
      data: {
        provider: "stripe",
        eventType: event.type ?? "unknown",
        payload: body.slice(0, 10000),
        signature: signature || null,
        status: "rejected",
        error: "STRIPE_WEBHOOK_SECRET not configured — webhook rejected (fail-closed)",
      },
    });
    return apiError("Webhook secret not configured", 401);
  }

  if (!signature) {
    return apiError("Missing stripe-signature header", 401);
  }

  // ── Real signature verification ──
  try {
    event = verifyStripeWebhook(body, signature, webhookSecret);
    if (!event) {
      return apiError("Webhook signature verification failed", 400);
    }
  } catch (e: any) {
    // Log the failed verification
    await db.webhookLog.create({
      data: {
        provider: "stripe",
        eventType: "signature_verification_failed",
        payload: body.slice(0, 10000),
        signature,
        status: "failed",
        error: e.message,
      },
    });
    return apiError(`Webhook signature verification failed: ${e.message}`, 400);
  }

  // Log the webhook (verified)
  const log = await db.webhookLog.create({
    data: {
      provider: "stripe",
      eventType: event.type ?? "unknown",
      payload: body.slice(0, 10000),
      signature,
      status: "received",
    },
  });

  try {
    const eventType = event.type;

    if (eventType === "payment_intent.succeeded") {
      await handlePaymentIntentSucceeded(event.data?.object);
    } else if (eventType === "payment_intent.payment_failed") {
      await handlePaymentIntentFailed(event.data?.object);
    } else if (eventType === "charge.refunded") {
      await handleChargeRefunded(event.data?.object);
    } else if (eventType === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(event.data?.object);
    } else if (eventType === "invoice.payment_succeeded") {
      await handleInvoicePaymentSucceeded(event.data?.object);
    } else if (eventType === "invoice.payment_failed") {
      await handleInvoicePaymentFailed(event.data?.object);
    }

    await db.webhookLog.update({
      where: { id: log.id },
      data: { status: "processed" },
    });

    return apiOk({ received: true });
  } catch (e: any) {
    console.error("[webhooks/stripe] processing error:", e);
    await db.webhookLog.update({
      where: { id: log.id },
      data: { status: "failed", error: e.message },
    });
    return apiError("Webhook processing failed", 500);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Payment Intent handlers (wallet top-ups)
// ────────────────────────────────────────────────────────────────────────────

async function handlePaymentIntentSucceeded(pi: any) {
  if (!pi?.id) return;
  const txn = await db.transaction.findFirst({
    where: { reference: pi.id },
  });
  if (!txn || txn.status !== "pending") return;

  await db.$transaction([
    db.transaction.update({
      where: { id: txn.id },
      data: { status: "completed", reference: pi.id },
    }),
    db.user.update({
      where: { id: txn.userId },
      data: {
        balance: { increment: txn.amount },
        lifetimeEarnings: { increment: txn.amount },
      },
    }),
    db.paymentIntent.updateMany({
      where: { providerIntentId: pi.id },
      data: { status: "succeeded" },
    }),
  ]);

  await createNotification({
    userId: txn.userId,
    type: "recharge",
    title: "Payment confirmed ✅",
    message: `$${txn.amount.toFixed(2)} confirmed via Stripe. Reference: ${pi.id}`,
    amount: txn.amount,
    severity: "success",
    sendEmail: true,
  });
}

async function handlePaymentIntentFailed(pi: any) {
  if (!pi?.id) return;
  const txn = await db.transaction.findFirst({
    where: { reference: pi.id },
  });
  if (!txn) return;

  await db.transaction.update({
    where: { id: txn.id },
    data: { status: "failed" },
  });
  await db.paymentIntent.updateMany({
    where: { providerIntentId: pi.id },
    data: { status: "failed" },
  });

  await createNotification({
    userId: txn.userId,
    type: "recharge",
    title: "Payment failed",
    message: `Your Stripe payment of $${txn.amount.toFixed(2)} failed.`,
    severity: "warning",
    sendEmail: true,
  });
}

async function handleChargeRefunded(charge: any) {
  if (!charge?.payment_intent) return;
  const txn = await db.transaction.findFirst({
    where: { reference: charge.payment_intent },
  });
  if (!txn) return;

  await db.$transaction([
    db.transaction.update({
      where: { id: txn.id },
      data: { status: "failed" }, // mark as refunded
    }),
    db.user.update({
      where: { id: txn.userId },
      data: { balance: { decrement: txn.amount } },
    }),
  ]);

  await createNotification({
    userId: txn.userId,
    type: "recharge",
    title: "Payment refunded",
    message: `$${txn.amount.toFixed(2)} has been refunded. Amount deducted from your balance.`,
    amount: -txn.amount,
    severity: "warning",
    sendEmail: true,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Checkout session handler (wallet top-up only)
// ────────────────────────────────────────────────────────────────────────────

/**
 * checkout.session.completed — when a Stripe Checkout Session completes.
 * Handles wallet top-up (one-time payment mode): credit the wallet balance
 * via the pending Transaction (looked up by session.id stored in transaction.reference).
 */
async function handleCheckoutSessionCompleted(session: any) {
  if (!session) return;

  const source = session.metadata?.source;

  // ── One-time wallet top-up (payment mode) ──
  if (session.mode === "payment" && source === "novsmm_wallet_topup") {
    const sessionId = session.id;
    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const txnPublicId = session.metadata?.transactionPublicId;

    // Find the pending transaction by publicId or by the Stripe session id
    // (we stored checkout.id in transaction.reference when creating the session).
    let txn = null;
    if (txnPublicId) {
      txn = await db.transaction.findFirst({
        where: { publicId: txnPublicId, status: "pending" },
      });
    }
    if (!txn) {
      txn = await db.transaction.findFirst({
        where: { reference: sessionId, status: "pending" },
      });
    }
    if (!txn) {
      console.warn("[webhooks/stripe] checkout.session.completed: no pending topup transaction found", { sessionId, txnPublicId });
      return;
    }

    // Idempotency: skip if already completed
    if (txn.status === "completed") return;

    await db.$transaction([
      db.transaction.update({
        where: { id: txn.id },
        data: {
          status: "completed",
          reference: sessionId,
          description: `Top-up via Stripe — checkout ${sessionId}`,
        },
      }),
      db.user.update({
        where: { id: txn.userId },
        data: {
          balance: { increment: txn.amount },
          lifetimeEarnings: { increment: txn.amount },
        },
      }),
    ]);

    await createNotification({
      userId: txn.userId,
      type: "recharge",
      title: "Wallet topped up 💰",
      message: `$${txn.amount.toFixed(2)} credited via Stripe. New balance available immediately.`,
      amount: txn.amount,
      severity: "success",
      sendEmail: true,
    });

    await audit(txn.userId, "create", "transaction", txn.id, { type: "topup", amount: txn.amount, method: "stripe", sessionId });

    return;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Invoice handlers (one-off payments)
// ────────────────────────────────────────────────────────────────────────────

/**
 * invoice.payment_succeeded — records a Transaction (type "topup") for a
 * successful one-off payment received.
 */
async function handleInvoicePaymentSucceeded(invoice: any) {
  if (!invoice?.id) return;

  // Idempotency: skip if we already recorded this invoice.
  const existing = await db.transaction.findFirst({
    where: { reference: invoice.id },
  });
  if (existing) return;

  // Resolve the user via customer_email.
  let userId: string | null = null;
  if (invoice.customer_email) {
    const u = await db.user.findUnique({ where: { email: invoice.customer_email } });
    if (u) userId = u.id;
  }
  if (!userId) {
    console.warn("[webhooks/stripe] invoice.payment_succeeded: could not resolve user");
    return;
  }

  const amount = (invoice.amount_paid ?? invoice.total ?? 0) / 100;

  const publicId = await nextPublicId("TX", 8842);
  await db.transaction.create({
    data: {
      publicId,
      userId,
      type: "topup",
      amount,
      description: `Payment ${invoice.number ?? invoice.id}`,
      status: "completed",
      method: "stripe",
      reference: invoice.id,
    },
  });

  await createNotification({
    userId,
    type: "recharge",
    title: "Payment received 💰",
    message: `Payment of $${amount.toFixed(2)} confirmed. Reference: ${invoice.id}`,
    amount,
    severity: "success",
    sendEmail: true,
  });
}

/**
 * invoice.payment_failed — notify the user that a payment failed.
 */
async function handleInvoicePaymentFailed(invoice: any) {
  if (!invoice?.id) return;

  let userId: string | null = null;
  if (invoice.customer_email) {
    const u = await db.user.findUnique({ where: { email: invoice.customer_email } });
    if (u) userId = u.id;
  }
  if (!userId) {
    console.warn("[webhooks/stripe] invoice.payment_failed: could not resolve user");
    return;
  }

  const amount = (invoice.amount_due ?? invoice.total ?? 0) / 100;

  await createNotification({
    userId,
    type: "system",
    title: "Payment failed ⚠️",
    message: `Your payment of $${amount.toFixed(2)} could not be processed. Please update your payment method to avoid service interruption.`,
    amount: -amount,
    severity: "warning",
    sendEmail: true,
  });
}
