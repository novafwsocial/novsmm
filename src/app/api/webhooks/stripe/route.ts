import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, apiError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { verifyStripeWebhook, isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/webhooks/stripe — Stripe webhook handler.
 *
 * When STRIPE_WEBHOOK_SECRET is set:
 * 1. Verifies the signature using verifyStripeWebhook()
 * 2. Processes the event (payment_intent.succeeded, payment_intent.payment_failed)
 * 3. Credits the user's balance atomically
 * 4. Sends a notification + email
 *
 * Without STRIPE_WEBHOOK_SECRET, runs in "log mode" — records all webhooks for audit.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: any;
  let verified = false;

  if (isStripeConfigured() && process.env.STRIPE_WEBHOOK_SECRET && signature) {
    // ── Real signature verification ──
    try {
      event = verifyStripeWebhook(body, signature);
      if (!event) {
        return apiError("Webhook signature verification failed", 400);
      }
      verified = true;
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
  } else {
    // ── Log mode (no secret configured) ──
    try {
      event = JSON.parse(body);
    } catch {
      return apiError("Invalid JSON", 400);
    }
  }

  // Log the webhook
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
      const pi = event.data?.object;
      // Find the transaction by the Stripe PaymentIntent ID
      const txn = await db.transaction.findFirst({
        where: { reference: pi?.id },
      });
      if (txn && txn.status === "pending") {
        // Credit balance atomically
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
          // Update PaymentIntent record if exists
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
    } else if (eventType === "payment_intent.payment_failed") {
      const pi = event.data?.object;
      const txn = await db.transaction.findFirst({
        where: { reference: pi?.id },
      });
      if (txn) {
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
    } else if (eventType === "charge.refunded") {
      const charge = event.data?.object;
      const txn = await db.transaction.findFirst({
        where: { reference: charge?.payment_intent },
      });
      if (txn) {
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
    }

    await db.webhookLog.update({
      where: { id: log.id },
      data: { status: "processed" },
    });

    return apiOk({ received: true, verified });
  } catch (e: any) {
    await db.webhookLog.update({
      where: { id: log.id },
      data: { status: "failed", error: e.message },
    });
    return apiError("Webhook processing failed", 500);
  }
}
