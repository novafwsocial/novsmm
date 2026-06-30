import Stripe from "stripe";

/**
 * Stripe client — initialized lazily.
 * Set STRIPE_SECRET_KEY in .env to enable real payments.
 * Without it, the topup route falls back to sandbox mode.
 */

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    });
  }
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Create a Stripe PaymentIntent for a wallet top-up.
 * Returns the client_secret for Stripe.js to use on the frontend.
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = "usd"
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses cents
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: { source: "novsmm_wallet_topup" },
  });

  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}

/**
 * Verify a Stripe webhook signature.
 * Returns the verified event or throws.
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return null;

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    secret
  );
}

/**
 * Create a Stripe refund for a payment intent.
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number // optional partial refund in cents
): Promise<Stripe.Refund | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount ? { amount } : {}),
  });
}
