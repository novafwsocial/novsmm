import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk, getBaseUrl } from "@/lib/api-utils";
import { decryptJSON } from "@/lib/crypto-utils";
import { verifyDepayWebhook } from "@/lib/depay";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/webhooks/depay
 *
 * Receives payment notifications from DePay. When a payment completes, the
 * user's wallet balance is credited atomically.
 *
 * Security:
 *  - The webhook signature is verified using HMAC-SHA256 with the webhookSecret
 *    stored in the PaymentMethod.config column.
 *  - Idempotency: if the transaction is already "completed", we skip.
 *
 * Expected DePay event types:
 *  - payment.completed   → credit the wallet
 *  - payment.failed      → mark transaction as failed
 *  - payment.refunded    → reverse the credit
 */
export async function POST(req: NextRequest) {
  // ── Read the raw body (needed for signature verification) ──
  const rawBody = await req.text();

  // ── Extract DePay signature header ──
  const signature = req.headers.get("x-depay-signature") ?? "";

  if (!signature) {
    return apiError("Missing DePay signature header", 401);
  }

  // ── Look up the DePay payment method to get the webhookSecret ──
  const pm = await db.paymentMethod.findUnique({
    where: { name: "DePay" },
  });

  if (!pm) {
    return apiError("DePay payment method not found", 404);
  }

  // Decrypt the credentials
  let creds: any = null;
  try {
    if (pm.config) creds = decryptJSON(pm.config);
  } catch (e) {
    console.error("[webhooks/depay] Failed to decrypt config:", e);
  }

  if (!creds?.webhookSecret) {
    console.error("[webhooks/depay] No webhookSecret configured");
    return apiError("DePay webhook secret not configured", 500);
  }

  // ── Verify the webhook signature ──
  const isValid = verifyDepayWebhook(rawBody, signature, creds.webhookSecret);
  if (!isValid) {
    console.warn("[webhooks/depay] Invalid signature — rejecting webhook");
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
      provider: "depay",
      eventType,
      payload: rawBody.slice(0, 4000),
      status: "received",
    },
  }).catch(() => null);

  try {
    // ── payment.completed → credit the wallet ──
    if (eventType === "payment.completed" || eventType === "payment.succeeded") {
      await handlePaymentCompleted(data);
    }
    // ── payment.failed → mark transaction as failed ──
    else if (eventType === "payment.failed") {
      await handlePaymentFailed(data);
    }
    // ── payment.refunded → reverse the credit ──
    else if (eventType === "payment.refunded") {
      await handlePaymentRefunded(data);
    }
    else {
      console.log(`[webhooks/depay] Unhandled event type: ${eventType}`);
    }

    if (webhookLog) {
      await db.webhookLog.update({
        where: { id: webhookLog.id },
        data: { status: "processed" },
      });
    }

    return apiOk({ received: true, eventType, verified: true });
  } catch (e: any) {
    console.error("[webhooks/depay] Processing error:", e);
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

async function handlePaymentCompleted(data: any) {
  const paymentId: string | undefined = data?.id ?? data?.payment_id;
  const txnPublicId: string | undefined =
    data?.metadata?.transaction_public_id ?? data?.reference;

  if (!paymentId && !txnPublicId) {
    console.warn("[webhooks/depay] payment.completed: no payment_id or reference");
    return;
  }

  let txn: any = null;
  if (paymentId) {
    txn = await db.transaction.findFirst({
      where: { reference: `depay:${paymentId}`, status: "pending" },
    });
  }
  if (!txn && txnPublicId) {
    txn = await db.transaction.findFirst({
      where: { publicId: txnPublicId, status: "pending" },
    });
  }

  if (!txn) {
    console.warn("[webhooks/depay] payment.completed: no pending transaction found", { paymentId, txnPublicId });
    return;
  }

  if (txn.status === "completed") return;

  await db.$transaction([
    db.transaction.update({
      where: { id: txn.id },
      data: {
        status: "completed",
        reference: `depay:${paymentId ?? txn.publicId}`,
        description: `Top-up via DePay — payment ${paymentId ?? txn.publicId}`,
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
    message: `$${txn.amount.toFixed(2)} credited via DePay. New balance available immediately.`,
    amount: txn.amount,
    severity: "success",
    sendEmail: true,
  });

  await db.auditLog.create({
    data: {
      userId: txn.userId,
      action: "create",
      entity: "transaction",
      entityId: txn.id,
      metadata: JSON.stringify({
        type: "topup",
        amount: txn.amount,
        method: "depay",
        paymentId: paymentId ?? txn.publicId,
      }),
    },
  });

  console.log(`[webhooks/depay] Credited $${txn.amount} to user ${txn.userId} (txn ${txn.publicId})`);
}

async function handlePaymentFailed(data: any) {
  const paymentId: string | undefined = data?.id ?? data?.payment_id;
  const txnPublicId: string | undefined =
    data?.metadata?.transaction_public_id ?? data?.reference;

  let txn: any = null;
  if (paymentId) {
    txn = await db.transaction.findFirst({
      where: { reference: `depay:${paymentId}` },
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
      message: `Your DePay top-up of $${txn.amount.toFixed(2)} could not be processed.`,
      severity: "warning",
    });
  }
}

async function handlePaymentRefunded(data: any) {
  const paymentId: string | undefined = data?.id ?? data?.payment_id;
  const txnPublicId: string | undefined =
    data?.metadata?.transaction_public_id ?? data?.reference;

  let txn: any = null;
  if (paymentId) {
    txn = await db.transaction.findFirst({
      where: { reference: `depay:${paymentId}`, status: "completed" },
    });
  }
  if (!txn && txnPublicId) {
    txn = await db.transaction.findFirst({
      where: { publicId: txnPublicId, status: "completed" },
    });
  }

  if (!txn) return;

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
    message: `$${txn.amount.toFixed(2)} was refunded from your wallet (DePay refund).`,
    amount: -txn.amount,
    severity: "warning",
  });
}

/**
 * GET /api/webhooks/depay — returns the webhook URL for the admin to
 * configure in the DePay dashboard.
 */
export async function GET() {
  const baseUrl = await getBaseUrl();
  return apiOk({
    provider: "depay",
    webhookUrl: `${baseUrl}/api/webhooks/depay`,
    note: "Configure this URL in your DePay dashboard under Integrations → Webhooks.",
  });
}
