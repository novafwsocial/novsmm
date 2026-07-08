import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk, getBaseUrl } from "@/lib/api-utils";
import { decryptJSON } from "@/lib/crypto-utils";
import { verifyAurpayWebhook } from "@/lib/aurpay";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/webhooks/aurpay
 *
 * Receives payment notifications from AURPay. When a payment succeeds, the
 * user's wallet balance is credited atomically.
 *
 * Security:
 *  - The webhook signature is verified using HMAC-SHA256 with the apiSecret
 *    stored in the PaymentMethod.config column.
 *  - Replay protection: timestamps older than 5 minutes are rejected.
 *  - Idempotency: if the transaction is already "completed", we skip.
 *
 * Expected AURPay event types:
 *  - payment.succeeded   → credit the wallet
 *  - payment.failed      → mark transaction as failed
 *  - payment.refunded    → reverse the credit
 */
export async function POST(req: NextRequest) {
  // ── Read the raw body (needed for signature verification) ──
  const rawBody = await req.text();

  // ── Extract AURPay signature headers ──
  const signature = req.headers.get("x-aurpay-signature") ?? "";
  const timestamp = req.headers.get("x-aurpay-timestamp") ?? "";

  if (!signature || !timestamp) {
    return apiError("Missing AURPay signature headers", 401);
  }

  // ── Look up the AURPay payment method to get the apiSecret ──
  const pm = await db.paymentMethod.findUnique({
    where: { name: "AURPay" },
  });

  if (!pm) {
    return apiError("AURPay payment method not found", 404);
  }

  // Decrypt the credentials
  let creds: any = null;
  try {
    if (pm.config) creds = decryptJSON(pm.config);
  } catch (e) {
    console.error("[webhooks/aurpay] Failed to decrypt config:", e);
  }

  if (!creds?.apiSecret) {
    console.error("[webhooks/aurpay] No apiSecret configured");
    return apiError("AURPay webhook secret not configured", 500);
  }

  // ── Verify the webhook signature ──
  const isValid = verifyAurpayWebhook(rawBody, signature, timestamp, creds.apiSecret);
  if (!isValid) {
    console.warn("[webhooks/aurpay] Invalid signature — rejecting webhook");
    return apiError("Invalid signature", 401);
  }

  // ── Parse the event ──
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return apiError("Invalid JSON body", 400);
  }

  const eventType: string = event?.type ?? event?.event_type ?? "";
  const data: any = event?.data ?? event?.payload ?? event;

  // ── Log the webhook for audit ──
  const webhookLog = await db.webhookLog.create({
    data: {
      provider: "aurpay",
      eventType,
      payload: rawBody.slice(0, 4000), // truncate to fit column
      status: "received",
    },
  }).catch(() => null);

  try {
    // ── payment.succeeded → credit the wallet ──
    if (eventType === "payment.succeeded" || eventType === "order.completed") {
      await handlePaymentSucceeded(data);
    }
    // ── payment.failed → mark transaction as failed ──
    else if (eventType === "payment.failed" || eventType === "order.failed") {
      await handlePaymentFailed(data);
    }
    // ── payment.refunded → reverse the credit ──
    else if (eventType === "payment.refunded" || eventType === "order.refunded") {
      await handlePaymentRefunded(data);
    }
    // Unknown event — acknowledge but don't process
    else {
      console.log(`[webhooks/aurpay] Unhandled event type: ${eventType}`);
    }

    if (webhookLog) {
      await db.webhookLog.update({
        where: { id: webhookLog.id },
        data: { status: "processed" },
      });
    }

    return apiOk({ received: true, eventType, verified: true });
  } catch (e: any) {
    console.error("[webhooks/aurpay] Processing error:", e);
    if (webhookLog) {
      await db.webhookLog.update({
        where: { id: webhookLog.id },
        data: { status: "failed", error: e?.message ?? "unknown" },
      });
    }
    return apiError("Webhook processing failed", 500);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Event handlers
// ────────────────────────────────────────────────────────────────────────────

/**
 * payment.succeeded — credit the user's wallet.
 * Looks up the pending transaction by the AURPay order id (stored in
 * transaction.reference as `aurpay:{orderId}`) or by the metadata
 * transaction_public_id.
 */
async function handlePaymentSucceeded(data: any) {
  const orderId: string | undefined =
    data?.order_id ?? data?.id ?? data?.orderId;
  const txnPublicId: string | undefined =
    data?.metadata?.transaction_public_id ??
    data?.reference ??
    data?.merchant_reference;

  if (!orderId && !txnPublicId) {
    console.warn("[webhooks/aurpay] payment.succeeded: no order_id or reference");
    return;
  }

  // Find the pending transaction
  let txn = null;
  if (orderId) {
    txn = await db.transaction.findFirst({
      where: { reference: `aurpay:${orderId}`, status: "pending" },
    });
  }
  if (!txn && txnPublicId) {
    txn = await db.transaction.findFirst({
      where: { publicId: txnPublicId, status: "pending" },
    });
  }

  if (!txn) {
    console.warn("[webhooks/aurpay] payment.succeeded: no pending transaction found", { orderId, txnPublicId });
    return;
  }

  // Idempotency: skip if already completed
  if (txn.status === "completed") return;

  // ── Credit the balance atomically ──
  await db.$transaction([
    db.transaction.update({
      where: { id: txn.id },
      data: {
        status: "completed",
        reference: `aurpay:${orderId ?? txn.publicId}`,
        description: `Top-up via AURPay — order ${orderId ?? txn.publicId}`,
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

  // ── Notify the user ──
  await createNotification({
    userId: txn.userId,
    type: "recharge",
    title: "Wallet topped up 💰",
    message: `$${txn.amount.toFixed(2)} credited via AURPay. New balance available immediately.`,
    amount: txn.amount,
    severity: "success",
    sendEmail: true,
  });

  // ── Audit log ──
  await db.auditLog.create({
    data: {
      userId: txn.userId,
      action: "create",
      entity: "transaction",
      entityId: txn.id,
      metadata: JSON.stringify({
        type: "topup",
        amount: txn.amount,
        method: "aurpay",
        orderId: orderId ?? txn.publicId,
      }),
    },
  });

  console.log(`[webhooks/aurpay] Credited $${txn.amount} to user ${txn.userId} (txn ${txn.publicId})`);
}

/**
 * payment.failed — mark the transaction as failed.
 */
async function handlePaymentFailed(data: any) {
  const orderId: string | undefined = data?.order_id ?? data?.id;
  const txnPublicId: string | undefined =
    data?.metadata?.transaction_public_id ?? data?.reference;

  let txn = null;
  if (orderId) {
    txn = await db.transaction.findFirst({
      where: { reference: `aurpay:${orderId}` },
    });
  }
  if (!txn && txnPublicId) {
    txn = await db.transaction.findFirst({
      where: { publicId: txnPublicId },
    });
  }

  if (!txn) return;

  if (txn.status === "pending") {
    await db.transaction.update({
      where: { id: txn.id },
      data: { status: "failed" },
    });

    await createNotification({
      userId: txn.userId,
      type: "recharge",
      title: "Payment failed",
      message: `Your AURPay top-up of $${txn.amount.toFixed(2)} could not be processed.`,
      severity: "warning",
    });
  }
}

/**
 * payment.refunded — reverse the credit.
 */
async function handlePaymentRefunded(data: any) {
  const orderId: string | undefined = data?.order_id ?? data?.id;
  const txnPublicId: string | undefined =
    data?.metadata?.transaction_public_id ?? data?.reference;

  let txn = null;
  if (orderId) {
    txn = await db.transaction.findFirst({
      where: { reference: `aurpay:${orderId}`, status: "completed" },
    });
  }
  if (!txn && txnPublicId) {
    txn = await db.transaction.findFirst({
      where: { publicId: txnPublicId, status: "completed" },
    });
  }

  if (!txn) return;

  // Reverse the credit
  await db.$transaction([
    db.transaction.update({
      where: { id: txn.id },
      data: { status: "refunded" },
    }),
    db.user.update({
      where: { id: txn.userId },
      data: {
        balance: { decrement: txn.amount },
        lifetimeEarnings: { decrement: txn.amount },
      },
    }),
  ]);

  await createNotification({
    userId: txn.userId,
    type: "recharge",
    title: "Payment refunded",
    message: `$${txn.amount.toFixed(2)} was refunded from your wallet (AURPay refund).`,
    amount: -txn.amount,
    severity: "warning",
  });
}

/**
 * GET /api/webhooks/aurpay — returns the webhook URL for the admin to
 * configure in the AURPay dashboard.
 */
export async function GET() {
  const baseUrl = await getBaseUrl();
  return apiOk({
    provider: "aurpay",
    webhookUrl: `${baseUrl}/api/webhooks/aurpay`,
    note: "Configure this URL in your AURPay merchant dashboard under Webhooks.",
  });
}
