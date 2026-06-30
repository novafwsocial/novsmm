import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { topupSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { isStripeConfigured, createPaymentIntent } from "@/lib/stripe";

/**
 * POST /api/wallet/topup — process a payment and credit the wallet.
 *
 * Payment processing flow:
 * 1. Validate the amount and method
 * 2. Look up the payment method from DB (admin-configurable)
 * 3. Create a "pending" transaction
 * 4. Process the payment (sandbox: simulate gateway confirmation;
 *    production: call Stripe/MercadoPago API)
 * 5. On success: credit balance + mark transaction completed + notify
 * 6. On failure: mark failed + notify
 *
 * To enable real Stripe: set STRIPE_SECRET_KEY env var and uncomment
 * the stripe SDK code below.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = topupSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Invalid input", 422);
    }

    const { amount, method, reference } = parsed.data;

    // Validate payment method exists and is active
    const pm = await db.paymentMethod.findFirst({
      where: { name: method, status: "active" },
    });
    if (!pm) {
      return apiError("Payment method unavailable", 404);
    }

    // Create pending transaction
    const txnCount = await db.transaction.count();
    const publicId = `TX-${8842 + txnCount}`;
    const txn = await db.transaction.create({
      data: {
        publicId,
        userId,
        type: "topup",
        amount,
        description: `Top-up via ${pm.name}`,
        status: "pending",
        method: pm.name.toLowerCase().replace(/\s/g, "_"),
        reference: reference ?? `pi_${Date.now()}`,
      },
    });

    // ── Payment processing ──
    // If Stripe is configured, create a real PaymentIntent.
    // The frontend will use Stripe.js to collect card details with the client_secret.
    // The webhook (/api/webhooks/stripe) will credit the balance when payment succeeds.
    //
    // If Stripe is NOT configured, fall back to sandbox mode (instant success).

    let paymentResult: { success: boolean; reference: string };

    if (pm.name === "Stripe" && isStripeConfigured()) {
      // ── Real Stripe flow ──
      // Create a PaymentIntent — the client_secret is returned to the frontend
      // so Stripe.js can collect card details securely (we never touch PAN)
      const intent = await createPaymentIntent(amount, "usd");
      if (!intent) {
        await db.transaction.update({
          where: { id: txn.id },
          data: { status: "failed" },
        });
        return apiError("Payment gateway unavailable", 503);
      }

      // Store the payment intent ID on the transaction
      await db.transaction.update({
        where: { id: txn.id },
        data: { reference: intent.paymentIntentId },
      });

      // Also create a PaymentIntent record for tracking
      await db.paymentIntent.create({
        data: {
          publicId: intent.paymentIntentId,
          userId,
          amount,
          currency: "USD",
          method: "stripe",
          providerIntentId: intent.paymentIntentId,
          status: "pending",
          description: `Top-up via Stripe`,
        },
      });

      // Return the client_secret to the frontend
      // The frontend will confirm the payment with Stripe.js
      // The webhook will credit the balance when payment succeeds
      return apiOk({
        transaction: { id: txn.id, publicId: txn.publicId, status: "pending" },
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.paymentIntentId,
        message: "Payment intent created. Complete the payment with Stripe.js.",
      });
    } else {
      // ── Sandbox mode (no real payment) ──
      paymentResult = await processPayment(pm, amount, txn.reference ?? "");
    }

    if (!paymentResult.success) {
      await db.transaction.update({
        where: { id: txn.id },
        data: { status: "failed" },
      });
      await createNotification({
        userId,
        type: "recharge",
        title: "Payment failed",
        message: `Your top-up of $${amount.toFixed(2)} via ${pm.name} could not be processed.`,
        severity: "warning",
        sendEmail: true,
      });
      return apiError("Payment failed. Please try a different method.", 402);
    }

    // ── Success: credit balance atomically ──
    await db.$transaction([
      db.transaction.update({
        where: { id: txn.id },
        data: {
          status: "completed",
          reference: paymentResult.reference,
        },
      }),
      db.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
          lifetimeEarnings: { increment: amount },
        },
      }),
    ]);

    // Notification
    await createNotification({
      userId,
      type: "recharge",
      title: "Wallet topped up 💰",
      message: `$${amount.toFixed(2)} credited via ${pm.name}. New balance available immediately.`,
      amount,
      severity: "success",
      sendEmail: true,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId,
        action: "create",
        entity: "transaction",
        entityId: txn.id,
        metadata: JSON.stringify({ type: "topup", amount, method: pm.name }),
      },
    });

    return apiOk({
      transaction: await db.transaction.findUnique({ where: { id: txn.id } }),
      message: "Top-up successful",
    });
  } catch (e: any) {
    console.error("[wallet/topup] error:", e);
    return apiError("Top-up failed", 500);
  }
}

/**
 * Payment processor — sandbox mode.
 *
 * In production, this dispatches to the real gateway based on the method:
 *   - Stripe → stripe.paymentIntents.create()
 *   - Mercado Pago → fetch(mercadopago API)
 *   - Crypto → verify on-chain
 *
 * To enable real Stripe, install `stripe` and set STRIPE_SECRET_KEY.
 */
async function processPayment(
  pm: { name: string; config: string | null },
  amount: number,
  reference: string
): Promise<{ success: boolean; reference: string }> {
  // Sandbox: simulate a 1.5s processing delay + 99.5% success rate
  await new Promise((r) => setTimeout(r, 1500));

  // 0.5% random failure for realism
  if (Math.random() < 0.005) {
    return { success: false, reference };
  }

  // If STRIPE_SECRET_KEY is set, we could do real processing here:
  // if (process.env.STRIPE_SECRET_KEY && pm.name === "Stripe") { ... }

  return {
    success: true,
    reference: `${reference}_confirmed`,
  };
}
