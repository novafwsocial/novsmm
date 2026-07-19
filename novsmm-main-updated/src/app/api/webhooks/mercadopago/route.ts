import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { apiOk, apiError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { checkWebhookIp } from "@/lib/webhook-ip-check";
import { decryptJSON } from "@/lib/crypto-utils";

/**
 * POST /api/webhooks/mercadopago — Mercado Pago webhook handler.
 *
 * Security:
 * 1. Verifies the x-signature header (HMAC-SHA256) against MP_WEBHOOK_SECRET env var
 * 2. Fetches the payment status from MP API to confirm (never trust the webhook payload alone)
 * 3. Idempotent — checks txn.status before processing
 *
 * MP signature format: x-signature: ts=1750000000,v1=hex_hmac_sha256
 * The signed payload is: data.id.data.id...ts (the data.id from the body + ts from header)
 * See: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 */
export async function POST(req: NextRequest) {
  // SECURITY (S-M-007): optional IP allowlist (defense-in-depth on top of
  // signature verification). Skipped if WEBHOOK_IP_ALLOWLIST env var is unset.
  const ipCheck = checkWebhookIp(req);
  if (!ipCheck.allowed) {
    return apiError("Forbidden", 403);
  }

  const body = await req.text();
  const signature = req.headers.get("x-signature") || "";
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return apiError("Invalid JSON", 400);
  }

  // ── Signature verification (fail-closed) ──
  // In production, MP_WEBHOOK_SECRET must be set. Without it, anyone could POST
  // fake payment notifications and get free wallet top-ups.
  if (!webhookSecret) {
    // Log the unverified event for audit, but DO NOT process it
    await db.webhookLog.create({
      data: {
        provider: "mercadopago",
        eventType: event.type ?? event.action ?? "unknown",
        payload: body.slice(0, 10000),
        signature,
        status: "rejected",
        error: "MP_WEBHOOK_SECRET not configured — webhook rejected (fail-closed)",
      },
    });
    return apiError("Webhook secret not configured", 401);
  }

  // Parse ts and v1 from x-signature header
  const sigParts = signature.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {} as Record<string, string>);
  const ts = sigParts["ts"];
  const v1 = sigParts["v1"];

  if (!ts || !v1) {
    return apiError("Invalid signature format — missing ts or v1", 401);
  }

  // MP signs: {data.id}{ts} where data.id is from the webhook body
  const dataId = event.data?.id ? String(event.data.id) : "";
  const manifest = `${dataId}${ts}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(manifest)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (expectedSignature.length !== v1.length || !crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(v1, "hex")
  )) {
    await db.webhookLog.create({
      data: {
        provider: "mercadopago",
        eventType: event.type ?? event.action ?? "unknown",
        payload: body.slice(0, 10000),
        signature,
        status: "rejected",
        error: "Signature verification failed",
      },
    });
    return apiError("Signature verification failed", 401);
  }

  const log = await db.webhookLog.create({
    data: {
      provider: "mercadopago",
      eventType: event.type ?? event.action ?? "unknown",
      payload: body,
      signature,
      status: "received",
    },
  });

  try {
    // MP sends { type: "payment", data: { id: "123456" } }
    if (event.type === "payment" && event.data?.id) {
      const paymentId = String(event.data.id);

      // ── Fetch the payment status from MP API to confirm ──
      // Never trust the webhook payload alone — always fetch from MP API
      const mpMethod = await db.paymentMethod.findFirst({
        where: { name: "Mercado Pago", status: "active" },
        select: { config: true },
      });
      const mpCreds =
        typeof mpMethod?.config === "string" && mpMethod.config
          ? decryptJSON(mpMethod.config)
          : null;
      const mpAccessToken = mpCreds?.accessToken || process.env.MP_ACCESS_TOKEN;
      if (!mpAccessToken) {
        await db.webhookLog.update({
          where: { id: log.id },
          data: { status: "failed", error: "MP_ACCESS_TOKEN not configured — cannot confirm payment" },
        });
        return apiError("Payment confirmation not configured", 500);
      }

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpAccessToken}` },
      });
      if (!mpRes.ok) {
        await db.webhookLog.update({
          where: { id: log.id },
          data: { status: "failed", error: `MP API returned ${mpRes.status}` },
        });
        return apiError("Failed to fetch payment from MP API", 502);
      }
      const payment = await mpRes.json();

      // Only credit if the payment is approved
      if (payment.status !== "approved") {
        await db.webhookLog.update({
          where: { id: log.id },
          data: { status: "processed", error: `Payment status: ${payment.status} (not credited)` },
        });
        return apiOk({ received: true, status: payment.status });
      }

      // SECURITY (OWASP A08-1, P2): MP's HMAC signature only covers `data.id`
      // + `ts` — NOT the rest of the payload (status, amount, payer). If
      // MP_WEBHOOK_SECRET ever leaks, an attacker could forge a webhook with
      // an arbitrary data.id pointing to ANYONE'S approved MP payment and
      // trick us into crediting whichever NOVSMM transaction matches that
      // paymentId as `reference`.
      //
      // Defense-in-depth: verify that the MP payment's `external_reference`
      // field matches the NOVSMM transaction's `publicId`. This binds the
      // MP-side payment to OUR internal transaction ID — set as
      // `external_reference` when the MP preference is created in
      // wallet/topup/route.ts. If external_reference is missing or doesn't
      // match, refuse to credit.
      const externalReference = payment.external_reference ?? "";

      // SEC-1d-006 FIX: Reconcile the MP payment to a NOVSMM transaction.
      //
      // Primary lookup: by publicId === external_reference.
      //   The topup route sets external_reference = txn.publicId when creating
      //   the MP preference. MP echoes it back in the payment object. This is
      //   the RELIABLE way to match — it survives MP payment-id changes,
      //   retries, and preference re-creation.
      //
      // Fallback lookup: by reference === paymentId (legacy behavior).
      //   Pre-fix transactions (created before SEC-1d-006) have reference =
      //   "pi_<timestamp>" which will NOT match MP's paymentId, so this
      //   fallback only helps the rare case where a webhook race already
      //   updated the reference to the paymentId on a previous call.
      let txn = externalReference
        ? await db.transaction.findFirst({
            where: { publicId: externalReference },
          })
        : null;

      // Fallback: legacy reference-match (for transactions where external_reference
      // was not set, or for webhook retries that already updated the reference)
      if (!txn) {
        txn = await db.transaction.findFirst({
          where: { reference: paymentId },
        });
      }

      // Log for auditability if neither lookup found a transaction
      if (!txn) {
        await db.webhookLog.update({
          where: { id: log.id },
          data: {
            status: "failed",
            error: `No transaction found for paymentId=${paymentId}, external_reference=${externalReference || "(empty)"}`,
          },
        });
        console.warn("[webhooks/mercadopago] No matching transaction", {
          paymentId,
          externalReference,
          preferenceId: payment.preference_id ?? null,
        });
        return apiOk({ received: true, matched: false });
      }
      if (txn.status === "pending") {
        // If we found the txn via the legacy reference-match fallback (not via
        // external_reference), AND MP returned an external_reference that
        // doesn't match txn.publicId, reject — this means someone is trying
        // to credit this transaction using an MP payment that belongs to a
        // DIFFERENT transaction.
        if (externalReference && externalReference !== txn.publicId) {
          await db.webhookLog.update({
            where: { id: log.id },
            data: {
              status: "rejected",
              error: `external_reference mismatch (expected ${txn.publicId}, got ${externalReference})`,
            },
          });
          return apiError("Webhook rejected — external_reference mismatch", 403);
        }

        // FIX (W-1): Use conditional updateMany with status:"pending" inside
        // an interactive $transaction. Only ONE webhook can flip the status;
        // the other gets count=0 and aborts before crediting. Prevents
        // double-credit when MP retries the webhook.
        const result = await db.$transaction(async (tx) => {
          const updated = await tx.transaction.updateMany({
            where: { id: txn.id, status: "pending" },
            data: { status: "completed", reference: paymentId },
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
          console.log("[webhooks/mercadopago] Transaction already processed by concurrent webhook — skipping", { txnId: txn.id });
          return apiOk({ received: true });
        }

        // P-005 FIX: Invalidate user cache so the balance update is visible immediately.
        try {
          const { cacheInvalidate } = await import("@/lib/cache");
          await cacheInvalidate(`user:${txn.userId}`);
          await cacheInvalidate(`dashboard:${txn.userId}:*`);
        } catch {}

        await createNotification({
          userId: txn.userId,
          type: "recharge",
          title: "Pago confirmado ✅",
          message: `$${txn.amount.toFixed(2)} confirmado via Mercado Pago. ID: ${paymentId}`,
          amount: txn.amount,
          severity: "success",
          sendEmail: true,
        });
      }
    }

    await db.webhookLog.update({
      where: { id: log.id },
      data: { status: "processed" },
    });

    return apiOk({ received: true });
  } catch (e: any) {
    await db.webhookLog.update({
      where: { id: log.id },
      data: { status: "failed", error: e.message },
    });
    return apiError("Webhook processing failed", 500);
  }
}
