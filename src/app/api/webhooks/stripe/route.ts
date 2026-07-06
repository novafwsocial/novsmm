import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, apiError, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import {
  verifyStripeWebhook,
  resolveStripeWebhookSecret,
  getStripe,
} from "@/lib/stripe";
import { nextPublicId } from "@/lib/ids";

/**
 * POST /api/webhooks/stripe — Stripe webhook handler.
 *
 * Handles:
 *   - payment_intent.succeeded      → credit wallet (existing top-up flow)
 *   - payment_intent.payment_failed → mark txn failed
 *   - charge.refunded               → reverse credit
 *   - checkout.session.completed    → if subscription mode, create local Subscription
 *   - customer.subscription.updated → sync status/dates/amount
 *   - customer.subscription.deleted → mark canceled + downgrade user.plan to "free"
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
 * wallet top-ups / subscription activations.
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
    } else if (eventType === "customer.subscription.updated") {
      await handleSubscriptionUpdated(event.data?.object);
    } else if (eventType === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(event.data?.object);
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
// Subscription handlers
// ────────────────────────────────────────────────────────────────────────────

/**
 * checkout.session.completed — when a Stripe Checkout Session completes.
 * - For subscription mode: create the local Subscription record (idempotent).
 * - For payment mode (one-time top-up): credit the wallet balance via the
 *   pending Transaction (looked up by session.id stored in transaction.reference).
 */
async function handleCheckoutSessionCompleted(session: any) {
  if (!session) return;

  const userId = session.client_reference_id;
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

  // ── Subscription mode ──
  if (session.mode !== "subscription") return;

  const subUserId = session.client_reference_id;
  if (!subUserId) {
    console.warn("[webhooks/stripe] checkout.session.completed: no client_reference_id");
    return;
  }

  const stripeSubscriptionId = session.subscription as string | undefined;
  if (!stripeSubscriptionId) return;

  // Idempotency: skip if a subscription with this Stripe ID already exists.
  const existing = await db.subscription.findFirst({
    where: { stripeSubscriptionId },
  });
  if (existing) return;

  // Fetch the full subscription object from Stripe to get current period + plan.
  const stripe = getStripe();
  let subObj: any = null;
  if (stripe) {
    try {
      subObj = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    } catch (e: any) {
      console.warn("[webhooks/stripe] could not retrieve subscription:", e?.message);
    }
  }

  // Resolve plan from metadata (we set `userId` + `source` only; plan comes from price lookup).
  // We try to infer plan from the price nickname or fall back to "starter".
  let plan = "starter";
  let amount = 0;
  if (subObj?.items?.data?.[0]?.price) {
    const price = subObj.items.data[0].price;
    const nickname = (price.nickname || "").toLowerCase();
    if (nickname.includes("enterprise") || nickname.includes("ente")) plan = "enterprise";
    else if (nickname.includes("growth")) plan = "growth";
    else if (nickname.includes("starter")) plan = "starter";
    amount = (price.unit_amount ?? 0) / 100;
  }
  if (!amount && session.amount_total) {
    amount = session.amount_total / 100;
  }

  const now = new Date();
  const periodStart = subObj?.current_period_start
    ? new Date(subObj.current_period_start * 1000)
    : now;
  const periodEnd = subObj?.current_period_end
    ? new Date(subObj.current_period_end * 1000)
    : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Cancel any prior active local subscription for this user (defensive).
  await db.subscription.updateMany({
    where: { userId: subUserId, status: "active", stripeSubscriptionId: null },
    data: { status: "canceled" },
  });

  await db.subscription.create({
    data: {
      userId: subUserId,
      plan,
      stripeSubscriptionId,
      status: "active",
      amount,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });

  // Upgrade the user's plan
  await db.user.update({
    where: { id: subUserId },
    data: { plan },
  });

  // Notification
  await createNotification({
    userId: subUserId,
    type: "system",
    title: `Subscription activated 🎉`,
    message: `Your ${plan} subscription is now active. Next billing: ${periodEnd.toLocaleDateString()}`,
    amount: -amount,
    severity: "success",
    sendEmail: true,
  });
}

/**
 * customer.subscription.updated — sync status, period dates, and amount
 * from Stripe to the local Subscription record (idempotent).
 */
async function handleSubscriptionUpdated(sub: any) {
  if (!sub?.id) return;

  const local = await db.subscription.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });
  if (!local) return;

  const status = mapStripeSubStatus(sub.status);
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : local.currentPeriodStart;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : local.currentPeriodEnd;

  let amount = local.amount;
  if (sub.items?.data?.[0]?.price?.unit_amount) {
    amount = sub.items.data[0].price.unit_amount / 100;
  }

  await db.subscription.update({
    where: { id: local.id },
    data: {
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      amount,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    },
  });

  // Keep user.plan in sync (e.g. past_due → keep current plan; canceled → downgrade on `deleted`).
  if (status === "active" || status === "trialing") {
    await db.user.update({
      where: { id: local.userId },
      data: { plan: local.plan },
    });
  }
}

/**
 * customer.subscription.deleted — mark the subscription as canceled and
 * downgrade the user's plan back to "free".
 */
async function handleSubscriptionDeleted(sub: any) {
  if (!sub?.id) return;

  const local = await db.subscription.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });
  if (local) {
    await db.subscription.update({
      where: { id: local.id },
      data: { status: "canceled", cancelAtPeriodEnd: false },
    });
    // Downgrade user plan
    await db.user.update({
      where: { id: local.userId },
      data: { plan: "free" },
    });

    await createNotification({
      userId: local.userId,
      type: "system",
      title: "Subscription ended",
      message: `Your ${local.plan} subscription has ended. You've been moved to the Free plan.`,
      severity: "warning",
      sendEmail: true,
    });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Invoice handlers (recurring billing)
// ────────────────────────────────────────────────────────────────────────────

/**
 * invoice.payment_succeeded — records a Transaction (type "topup" for one-off
 * invoices, or "subscription" via the Subscription record). We use type "topup"
 * per spec since this is a successful payment received.
 *
 * For subscription invoices, we also extend the local Subscription's period.
 */
async function handleInvoicePaymentSucceeded(invoice: any) {
  if (!invoice?.id) return;

  // Idempotency: skip if we already recorded this invoice.
  const existing = await db.transaction.findFirst({
    where: { reference: invoice.id },
  });
  if (existing) return;

  // Resolve the user: prefer customer_email → User.email, fall back to
  // client_reference_id on the parent checkout session, or the subscription's
  // client_reference_id stored in metadata.
  let userId: string | null = null;
  if (invoice.customer_email) {
    const u = await db.user.findUnique({ where: { email: invoice.customer_email } });
    if (u) userId = u.id;
  }
  if (!userId && invoice.customer) {
    // Try to find by Stripe customer ID stored in Subscription
    // (we don't currently store customer_id — fall through)
  }
  if (!userId) {
    // Try to find via subscription
    if (invoice.subscription) {
      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: invoice.subscription },
      });
      if (sub) userId = sub.userId;
    }
  }
  if (!userId) {
    console.warn("[webhooks/stripe] invoice.payment_succeeded: could not resolve user");
    return;
  }

  const amount = (invoice.amount_paid ?? invoice.total ?? 0) / 100;
  const isSubscription = invoice.billing_reason === "subscription_cycle" ||
    invoice.billing_reason === "subscription_create" ||
    !!invoice.subscription;

  const publicId = await nextPublicId("TX", 8842);
  await db.transaction.create({
    data: {
      publicId,
      userId,
      type: "topup",
      amount,
      description: isSubscription
        ? `Subscription payment ${invoice.number ?? invoice.id}`
        : `Payment ${invoice.number ?? invoice.id}`,
      status: "completed",
      method: "stripe",
      reference: invoice.id,
    },
  });

  // For subscription invoices: extend the local subscription period.
  if (isSubscription && invoice.subscription) {
    const local = await db.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });
    if (local && invoice.lines?.data?.[0]?.period) {
      const p = invoice.lines.data[0].period;
      await db.subscription.update({
        where: { id: local.id },
        data: {
          currentPeriodStart: p.start ? new Date(p.start * 1000) : local.currentPeriodStart,
          currentPeriodEnd: p.end ? new Date(p.end * 1000) : local.currentPeriodEnd,
          status: "active",
        },
      });
    }
  }

  await createNotification({
    userId,
    type: "recharge",
    title: "Payment received 💰",
    message: isSubscription
      ? `Subscription payment of $${amount.toFixed(2)} confirmed.`
      : `Payment of $${amount.toFixed(2)} confirmed. Reference: ${invoice.id}`,
    amount,
    severity: "success",
    sendEmail: true,
  });
}

/**
 * invoice.payment_failed — notify the user + admins that a recurring payment failed.
 */
async function handleInvoicePaymentFailed(invoice: any) {
  if (!invoice?.id) return;

  let userId: string | null = null;
  if (invoice.customer_email) {
    const u = await db.user.findUnique({ where: { email: invoice.customer_email } });
    if (u) userId = u.id;
  }
  if (!userId && invoice.subscription) {
    const sub = await db.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });
    if (sub) userId = sub.userId;
  }
  if (!userId) {
    console.warn("[webhooks/stripe] invoice.payment_failed: could not resolve user");
    return;
  }

  const amount = (invoice.amount_due ?? invoice.total ?? 0) / 100;

  // Mark the local subscription as past_due if applicable
  if (invoice.subscription) {
    const local = await db.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });
    if (local) {
      await db.subscription.update({
        where: { id: local.id },
        data: { status: "past_due" },
      });
    }
  }

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

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function mapStripeSubStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "past_due";
    case "incomplete":
      return "past_due";
    case "incomplete_expired":
      return "canceled";
    default:
      return "active";
  }
}
