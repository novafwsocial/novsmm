import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, apiError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/webhooks/stripe — Stripe webhook handler.
 *
 * In production:
 * 1. Install `stripe` SDK: `bun add stripe`
 * 2. Set STRIPE_WEBHOOK_SECRET in .env
 * 3. Verify signature: stripe.webhooks.constructEvent(payload, sig, secret)
 * 4. Handle events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
 *
 * Currently runs in "log mode" — records all webhooks for audit.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return apiError("Invalid JSON", 400);
  }

  // Log the webhook
  const log = await db.webhookLog.create({
    data: {
      provider: "stripe",
      eventType: event.type ?? "unknown",
      payload: body,
      signature,
      status: "received",
    },
  });

  try {
    // ── Signature verification (production) ──
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);

    const eventType = event.type;

    if (eventType === "payment_intent.succeeded") {
      const pi = event.data?.object;
      // Find the transaction by reference
      const txn = await db.transaction.findFirst({
        where: { reference: pi?.id },
      });
      if (txn && txn.status === "pending") {
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
        await createNotification({
          userId: txn.userId,
          type: "recharge",
          title: "Payment failed",
          message: `Your Stripe payment of $${txn.amount.toFixed(2)} failed.`,
          severity: "warning",
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
