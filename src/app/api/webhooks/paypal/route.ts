import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, apiError, getBaseUrl } from "@/lib/api-utils";
import { decryptJSON } from "@/lib/crypto-utils";
import { createNotification } from "@/lib/notify";
import { checkWebhookIp } from "@/lib/webhook-ip-check";

/**
 * POST /api/webhooks/paypal — PayPal webhook handler.
 *
 * PayPal sends webhook events for various payment lifecycle changes. We
 * care about:
 *   • PAYMENT.CAPTURE.COMPLETED  → credit the user's wallet
 *   • PAYMENT.CAPTURE.DENIED     → mark the transaction as failed
 *
 * Security:
 * 1. Verifies the webhook signature via PayPal's verify-webhook-signature
 *    API (POST https://api-m.paypal.com/v1/notifications/verify-webhook-signature)
 *    using the client_id + client_secret + webhookId stored on the
 *    PaymentMethod.config column. This is the only secure way to verify
 *    PayPal webhooks — they use a per-transmission RSA signature over a
 *    cert URL, so we must delegate to PayPal's API for verification.
 * 2. Idempotent — only processes transactions that are still "pending".
 * 3. Atomic — wallet credit + transaction update are wrapped in a DB
 *    transaction so we never credit without marking the txn completed.
 *
 * IMPORTANT: We ALWAYS return 200 OK, even on errors — PayPal retries
 * webhooks that don't return 2xx, which can cause duplicate processing.
 * We log all failures via webhookLog for debugging.
 *
 * Reference:
 * https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
 */
export async function POST(req: NextRequest) {
  // SECURITY (S-M-007): optional IP allowlist (defense-in-depth on top of
  // signature verification). Skipped if WEBHOOK_IP_ALLOWLIST env var is unset.
  const ipCheck = checkWebhookIp(req);
  if (!ipCheck.allowed) {
    return apiError("Forbidden", 403);
  }

  const rawBody = await req.text();

  // ── Parse the event first so we can log it even if verification fails ──
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    await db.webhookLog
      .create({
        data: {
          provider: "paypal",
          eventType: "invalid_json",
          payload: rawBody.slice(0, 10000),
          status: "rejected",
          error: "Invalid JSON",
        },
      })
      .catch(() => null);
    return apiOk({ received: false }); // 200 to stop PayPal retries
  }

  const eventType: string = event?.event_type ?? "unknown";

  // QA-002 FIX: Check for required PayPal transmission headers BEFORE any
  // DB access. If headers are missing → return 401 immediately (no DB call).
  const transmissionId = req.headers.get("paypal-transmission-id") ?? "";
  const transmissionSig = req.headers.get("paypal-transmission-sig") ?? "";
  const certUrl = req.headers.get("paypal-cert-url") ?? "";
  const authAlgo = req.headers.get("paypal-auth-algo") ?? "";

  if (!transmissionId || !transmissionSig || !certUrl || !authAlgo) {
    await db.webhookLog
      .create({
        data: {
          provider: "paypal",
          eventType,
          payload: rawBody.slice(0, 10000),
          status: "rejected",
          error: "Missing PayPal transmission headers — webhook rejected",
        },
      })
      .catch(() => null);
    return apiError("Missing required PayPal headers", 401);
  }

  // ── Look up the PayPal payment method to get credentials + webhookId ──
  let pm: any;
  try {
    pm = await db.paymentMethod.findUnique({
      where: { name: "PayPal" },
    });
  } catch (e: any) {
    console.error("[webhooks/paypal] DB error:", e?.message);
    return apiError("Service temporarily unavailable", 503);
  }

  if (!pm) {
    await db.webhookLog
      .create({
        data: {
          provider: "paypal",
          eventType,
          payload: rawBody.slice(0, 10000),
          status: "rejected",
          error: "PayPal payment method not configured",
        },
      })
      .catch(() => null);
    return apiOk({ received: false });
  }

  // Decrypt credentials
  let creds: any = null;
  try {
    if (pm.config) creds = decryptJSON(pm.config);
  } catch (e) {
    console.error("[webhooks/paypal] Failed to decrypt config:", e);
  }

  if (!creds?.clientId || !creds?.clientSecret || !creds?.webhookId) {
    await db.webhookLog
      .create({
        data: {
          provider: "paypal",
          eventType,
          payload: rawBody.slice(0, 10000),
          status: "rejected",
          error: "PayPal clientId/clientSecret/webhookId not configured",
        },
      })
      .catch(() => null);
    return apiOk({ received: false });
  }

  // ── Verify the webhook signature via PayPal's API ──
  // Headers already extracted above (QA-002 fix).
  const transmissionTime = req.headers.get("paypal-transmission-time") ?? "";

  // Always log the webhook receipt (audit trail)
  const webhookLog = await db.webhookLog
    .create({
      data: {
        provider: "paypal",
        eventType,
        payload: rawBody.slice(0, 10000),
        signature: transmissionSig,
        status: "received",
      },
    })
    .catch(() => null);

  try {
    // ── Step 1: Get a PayPal access token (client credentials grant) ──
    const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[webhooks/paypal] Token request failed:", tokenRes.status, errText);
      if (webhookLog) {
        await db.webhookLog.update({
          where: { id: webhookLog.id },
          data: { status: "failed", error: `PayPal token API ${tokenRes.status}: ${errText.slice(0, 200)}` },
        });
      }
      return apiOk({ received: false });
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // ── Step 2: Verify the webhook signature ──
    const verifyBody = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: creds.webhookId,
      webhook_event: event,
    };

    const verifyRes = await fetch(
      "https://api-m.paypal.com/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(verifyBody),
      }
    );

    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      console.error("[webhooks/paypal] Verify API failed:", verifyRes.status, errText);
      if (webhookLog) {
        await db.webhookLog.update({
          where: { id: webhookLog.id },
          data: { status: "rejected", error: `Verify API ${verifyRes.status}: ${errText.slice(0, 200)}` },
        });
      }
      return apiOk({ received: false });
    }

    const verifyData = await verifyRes.json();
    const verificationStatus: string = verifyData.verification_status;

    if (verificationStatus !== "SUCCESS") {
      console.warn("[webhooks/paypal] Signature verification failed:", verificationStatus);
      if (webhookLog) {
        await db.webhookLog.update({
          where: { id: webhookLog.id },
          data: { status: "rejected", error: `Verification status: ${verificationStatus}` },
        });
      }
      return apiOk({ received: false });
    }

    // ── Step 3: Dispatch on event type ──
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      await handleCaptureCompleted(event);
    } else if (eventType === "PAYMENT.CAPTURE.DENIED") {
      await handleCaptureDenied(event);
    } else {
      console.log(`[webhooks/paypal] Unhandled event type: ${eventType}`);
    }

    if (webhookLog) {
      await db.webhookLog.update({
        where: { id: webhookLog.id },
        data: { status: "processed" },
      });
    }

    return apiOk({ received: true, eventType, verified: true });
  } catch (e: any) {
    console.error("[webhooks/paypal] Processing error:", e);
    if (webhookLog) {
      await db.webhookLog.update({
        where: { id: webhookLog.id },
        data: { status: "failed", error: e?.message ?? "unknown" },
      });
    }
    // Still return 200 to stop PayPal from retrying — we logged the error
    return apiOk({ received: false });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Event handlers
// ────────────────────────────────────────────────────────────────────────────

/**
 * PAYMENT.CAPTURE.COMPLETED — credit the user's wallet.
 *
 * The capture resource contains a `custom_id` field (set on the order's
 * purchase_units at topup time) which holds our transaction publicId.
 * We look up the pending transaction by:
 *   1. resource.custom_id  (the publicId we sent)
 *   2. resource.id         (the capture id, stored as txn.reference =
 *                            paypal:<orderId> is NOT the capture id, but we
 *                            also try the order id from the resource links
 *                            as a fallback)
 *   3. resource.supplementary_data.purchase_units[0].payments.captures[0].custom_id
 *
 * If we can't find a pending transaction, we acknowledge (200 OK) to stop
 * PayPal retries — likely a duplicate webhook for an already-processed txn.
 */
async function handleCaptureCompleted(event: any) {
  const resource: any = event?.resource ?? {};

  // The publicId we passed as custom_id when creating the PayPal order
  const customId: string | undefined =
    resource?.custom_id ??
    resource?.supplementary_data?.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ??
    resource?.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ??
    undefined;

  // The PayPal capture id and order id (for traceability)
  const captureId: string | undefined = resource?.id;
  const orderId: string | undefined =
    resource?.supplementary_data?.purchase_units?.[0]?.payments?.captures?.[0]?.id ??
    resource?.order_id ??
    // Try the "up" link from the capture resource
    resource?.links?.find((l: any) => l.rel === "up")?.href?.split("/")?.pop();

  // Find the pending transaction
  let txn: any = null;

  // Primary lookup: by publicId (custom_id we sent at topup)
  if (customId) {
    txn = await db.transaction.findFirst({
      where: { publicId: customId, status: "pending" },
    });
  }

  // Fallback 1: by paypal:<orderId> reference (stored at topup time)
  if (!txn && orderId) {
    txn = await db.transaction.findFirst({
      where: { reference: `paypal:${orderId}`, status: "pending" },
    });
  }

  // Fallback 2: by paypal:<captureId> reference
  if (!txn && captureId) {
    txn = await db.transaction.findFirst({
      where: { reference: `paypal:${captureId}`, status: "pending" },
    });
  }

  if (!txn) {
    console.warn("[webhooks/paypal] PAYMENT.CAPTURE.COMPLETED: no pending transaction found", {
      customId,
      orderId,
      captureId,
    });
    return;
  }

  // ── Credit the balance atomically (race-safe) ──
  // FIX (W-1): The old code did `if (txn.status === "completed") return`
  // OUTSIDE the $transaction, then `db.transaction.update({ where: { id } })`
  // INSIDE — two concurrent webhooks (PayPal retries automatically) could
  // both pass the check and both increment the balance → double credit.
  //
  // Now we use a conditional updateMany with `status: "pending"` inside an
  // interactive $transaction. Only ONE webhook can flip the status (the
  // other gets count=0 and aborts before crediting). This is the same
  // race-safe pattern used in /api/wallet/withdraw and /api/orders.
  const reference = `paypal:${captureId ?? orderId ?? txn.publicId}`;
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.transaction.updateMany({
      where: { id: txn.id, status: "pending" },
      data: {
        status: "completed",
        reference,
        description: `Top-up via PayPal — capture ${captureId ?? txn.publicId}`,
      },
    });
    if (updated.count === 0) {
      return { alreadyProcessed: true };
    }
    await tx.user.update({
      where: { id: txn.userId },
      data: {
        balance: { increment: txn.amount },
        lifetimeEarnings: { increment: txn.amount },
      },
    });
    return { alreadyProcessed: false };
  });

  if (result.alreadyProcessed) {
    console.log("[webhooks/paypal] Transaction already processed by concurrent webhook — skipping", { txnId: txn.id });
    return;
  }

  // P-005 FIX: Invalidate user cache so the balance update is visible
  // immediately (jwt callback caches balance for 30s).
  try {
    const { cacheInvalidate } = await import("@/lib/cache");
    await cacheInvalidate(`user:${txn.userId}`);
    await cacheInvalidate(`dashboard:${txn.userId}:*`);
  } catch {}

  // ── Notify the user ──
  await createNotification({
    userId: txn.userId,
    type: "recharge",
    title: "Wallet topped up 💰",
    message: `$${txn.amount.toFixed(2)} credited via PayPal. New balance available immediately.`,
    amount: txn.amount,
    severity: "success",
    sendEmail: true,
  });

  // ── Audit log ──
  await db.auditLog
    .create({
      data: {
        userId: txn.userId,
        action: "create",
        entity: "transaction",
        entityId: txn.id,
        metadata: JSON.stringify({
          type: "topup",
          amount: txn.amount,
          method: "paypal",
          captureId: captureId ?? null,
          orderId: orderId ?? null,
        }),
      },
    })
    .catch(() => null);

  console.log(
    `[webhooks/paypal] Credited $${txn.amount} to user ${txn.userId} (txn ${txn.publicId})`
  );
}

/**
 * PAYMENT.CAPTURE.DENIED — mark the transaction as failed.
 */
async function handleCaptureDenied(event: any) {
  const resource: any = event?.resource ?? {};

  const customId: string | undefined =
    resource?.custom_id ??
    resource?.supplementary_data?.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ??
    undefined;
  const captureId: string | undefined = resource?.id;
  const orderId: string | undefined =
    resource?.supplementary_data?.purchase_units?.[0]?.payments?.captures?.[0]?.id ??
    resource?.order_id;

  let txn: any = null;
  if (customId) {
    txn = await db.transaction.findFirst({ where: { publicId: customId } });
  }
  if (!txn && orderId) {
    txn = await db.transaction.findFirst({ where: { reference: `paypal:${orderId}` } });
  }
  if (!txn && captureId) {
    txn = await db.transaction.findFirst({ where: { reference: `paypal:${captureId}` } });
  }

  if (!txn) return;

  // FIX (W-1): Use conditional updateMany to prevent race with a concurrent
  // COMPLETED webhook. If another webhook already flipped the status, we
  // get count=0 and skip (don't overwrite completed→failed).
  const failResult = await db.transaction.updateMany({
    where: { id: txn.id, status: "pending" },
    data: { status: "failed" },
  });
  if (failResult.count > 0) {
    await createNotification({
      userId: txn.userId,
      type: "recharge",
      title: "Payment failed",
      message: `Your PayPal top-up of $${txn.amount.toFixed(2)} could not be processed.`,
      severity: "warning",
    });
  }
}

/**
 * GET /api/webhooks/paypal — returns the webhook URL for the admin to
 * configure in the PayPal dashboard.
 */
export async function GET() {
  const baseUrl = await getBaseUrl();
  return apiOk({
    provider: "paypal",
    webhookUrl: `${baseUrl}/api/webhooks/paypal`,
    note: "Configure this URL in your PayPal developer dashboard under Apps & Credentials → Webhooks.",
  });
}
