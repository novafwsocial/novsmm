import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk, getBaseUrl, audit } from "@/lib/api-utils";
import { decryptJSON } from "@/lib/crypto-utils";
import { verifyNowPaymentsWebhook } from "@/lib/nowpayments";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/webhooks/nowpayments
 *
 * Receives IPN (Instant Payment Notification) callbacks from NowPayments.
 * When a crypto payment is confirmed on-chain, the user's wallet balance is
 * credited atomically.
 *
 * Security:
 *  - The webhook signature is verified using HMAC-SHA256 with the ipnSecret
 *    stored in the PaymentMethod.config column.
 *  - Idempotency: if the transaction is already "completed", we skip.
 *
 * Expected NowPayments payment statuses:
 *  - waiting      → buyer hasn't paid yet (we wait)
 *  - confirming   → payment detected, waiting for confirmations
 *  - confirmed    → confirmed on-chain → CREDIT THE WALLET
 *  - sending      → payout in progress
 *  - finished     → fully processed → CREDIT THE WALLET (fallback)
 *  - failed       → mark transaction as failed
 *  - expired      → invoice expired without payment → mark as failed
 *  - refunded     → reverse the credit
 */
export async function POST(req: NextRequest) {
  // ── Read the raw body (needed for signature verification) ──
  const rawBody = await req.text();

  // ── Extract NowPayments signature header ──
  const signature = req.headers.get("x-nowpayments-sig") ?? "";

  if (!signature) {
    return apiError("Missing NowPayments signature header", 401);
  }

  // ── Look up the NowPayments payment method to get the ipnSecret ──
  const pm = await db.paymentMethod.findUnique({
    where: { name: "NowPayments" },
  });

  if (!pm) {
    return apiError("NowPayments payment method not found", 404);
  }

  // Decrypt the credentials
  let creds: any = null;
  try {
    if (pm.config) creds = decryptJSON(pm.config);
  } catch (e) {
    console.error("[webhooks/nowpayments] Failed to decrypt config:", e);
  }

  if (!creds?.ipnSecret) {
    console.error("[webhooks/nowpayments] No ipnSecret configured");
    return apiError("NowPayments IPN secret not configured", 500);
  }

  // ── Verify the webhook signature ──
  const isValid = verifyNowPaymentsWebhook(rawBody, signature, creds.ipnSecret);
  if (!isValid) {
    console.warn("[webhooks/nowpayments] Invalid signature — rejecting webhook");
    return apiError("Invalid signature", 401);
  }

  // ── Parse the IPN payload ──
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return apiError("Invalid JSON body", 400);
  }

  const status: string = payload?.payment_status ?? payload?.status ?? "";
  const paymentId: string = payload?.payment_id ?? payload?.id ?? "";
  const orderId: string = payload?.order_id ?? payload?.order_description ?? "";
  const txnPublicId: string | undefined =
    payload?.metadata?.transaction_public_id ?? orderId;

  // ── Log the webhook for audit ──
  const webhookLog = await db.webhookLog.create({
    data: {
      provider: "nowpayments",
      eventType: status || "unknown",
      payload: rawBody.slice(0, 4000),
      status: "received",
    },
  }).catch(() => null);

  try {
    // ── Route to the correct handler based on status ──
    if (status === "confirmed" || status === "finished") {
      await handlePaymentConfirmed(payload, paymentId, txnPublicId);
    } else if (status === "failed" || status === "expired") {
      await handlePaymentFailed(payload, paymentId, txnPublicId);
    } else if (status === "refunded") {
      await handlePaymentRefunded(payload, paymentId, txnPublicId);
    } else {
      // waiting, confirming, sending, new — informational, don't process yet
      console.log(`[webhooks/nowpayments] Status "${status}" — waiting for confirmation`);
    }

    if (webhookLog) {
      await db.webhookLog.update({
        where: { id: webhookLog.id },
        data: { status: "processed" },
      });
    }

    return apiOk({ received: true, status, verified: true });
  } catch (e: any) {
    console.error("[webhooks/nowpayments] Processing error:", e);
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

async function handlePaymentConfirmed(
  payload: any,
  paymentId: string,
  txnPublicId?: string
) {
  if (!paymentId && !txnPublicId) {
    console.warn("[webhooks/nowpayments] confirmed: no payment_id or reference");
    return;
  }

  // Find the pending transaction
  let txn = null;
  if (paymentId) {
    txn = await db.transaction.findFirst({
      where: { reference: `nowpayments:${paymentId}`, status: "pending" },
    });
  }
  if (!txn && txnPublicId) {
    txn = await db.transaction.findFirst({
      where: { publicId: txnPublicId, status: "pending" },
    });
  }

  if (!txn) {
    console.warn("[webhooks/nowpayments] confirmed: no pending transaction found", { paymentId, txnPublicId });
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
        reference: `nowpayments:${paymentId ?? txn.publicId}`,
        description: `Top-up via NowPayments — payment ${paymentId ?? txn.publicId}`,
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
    message: `$${txn.amount.toFixed(2)} credited via NowPayments (crypto). New balance available immediately.`,
    amount: txn.amount,
    severity: "success",
    sendEmail: true,
  });

  // ── Audit log ──
  await audit(txn.userId, "create", "transaction", txn.id, {
    type: "topup",
    amount: txn.amount,
    method: "nowpayments",
    paymentId: paymentId ?? txn.publicId,
    payCurrency: payload?.pay_currency,
    payAmount: payload?.pay_amount,
  });

  console.log(`[webhooks/nowpayments] Credited $${txn.amount} to user ${txn.userId} (txn ${txn.publicId})`);
}

async function handlePaymentFailed(
  payload: any,
  paymentId: string,
  txnPublicId?: string
) {
  let txn = null;
  if (paymentId) {
    txn = await db.transaction.findFirst({
      where: { reference: `nowpayments:${paymentId}` },
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
      message: `Your NowPayments crypto top-up of $${txn.amount.toFixed(2)} could not be processed.`,
      severity: "warning",
    });
  }
}

async function handlePaymentRefunded(
  payload: any,
  paymentId: string,
  txnPublicId?: string
) {
  let txn = null;
  if (paymentId) {
    txn = await db.transaction.findFirst({
      where: { reference: `nowpayments:${paymentId}`, status: "completed" },
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
    message: `$${txn.amount.toFixed(2)} was refunded from your wallet (NowPayments refund).`,
    amount: -txn.amount,
    severity: "warning",
  });
}

/**
 * GET /api/webhooks/nowpayments — returns the webhook URL for the admin to
 * configure in the NowPayments dashboard.
 */
export async function GET() {
  const baseUrl = await getBaseUrl();
  return apiOk({
    provider: "nowpayments",
    webhookUrl: `${baseUrl}/api/webhooks/nowpayments`,
    ipnNote: "Configure this URL in your NowPayments dashboard under Account Settings → IPN callback URL.",
  });
}
