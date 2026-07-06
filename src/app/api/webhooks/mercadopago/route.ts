import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { apiOk, apiError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

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
      const mpAccessToken = process.env.MP_ACCESS_TOKEN;
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

      // Find transaction by reference (paymentId)
      const txn = await db.transaction.findFirst({
        where: { reference: paymentId },
      });
      if (txn && txn.status === "pending") {
        await db.$transaction([
          db.transaction.update({
            where: { id: txn.id },
            data: { status: "completed", reference: paymentId },
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
