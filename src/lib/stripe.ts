import Stripe from "stripe";
import { db } from "./db";

/**
 * Stripe client — initialized lazily.
 * Set STRIPE_SECRET_KEY in .env (or in the PaymentMethod.config for the
 * "Stripe" method) to enable real payments.
 * Without it, callers fall back to sandbox mode.
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
 * Create a Stripe Checkout Session for a recurring subscription.
 *
 * Used by POST /api/subscriptions when STRIPE_PRICE_* env vars are set.
 * Returns the hosted checkout URL the browser should be redirected to.
 */
export async function createCheckoutSession(params: {
  priceId: string;
  userId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string | null } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    customer_email: params.customerEmail,
    metadata: {
      userId: params.userId,
      source: "novsmm_subscription",
    },
  });

  return { id: session.id, url: session.url };
}

/**
 * Create a Stripe Checkout Session for a one-time wallet top-up.
 *
 * The browser redirects to session.url. After payment, Stripe redirects
 * back to successUrl, and the webhook (checkout.session.completed) credits
 * the user's balance — so we do NOT credit here.
 */
export async function createTopupCheckoutSession(params: {
  amount: number;
  userId: string;
  customerEmail: string;
  transactionPublicId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string | null } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(params.amount * 100), // cents
          product_data: {
            name: `NOVSMM Wallet Top-up — $${params.amount.toFixed(2)}`,
            description: `Wallet credit for ${params.customerEmail}`,
          },
        },
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    customer_email: params.customerEmail,
    metadata: {
      userId: params.userId,
      source: "novsmm_wallet_topup",
      transactionPublicId: params.transactionPublicId,
      amount: String(params.amount),
    },
  });

  return { id: session.id, url: session.url };
}

/**
 * Verify a Stripe webhook signature.
 * Returns the verified event or throws.
 *
 * The webhook secret is read from STRIPE_WEBHOOK_SECRET env var, with a
 * fallback to the Setting table (key: `stripe.webhookSecret`) so admins can
 * configure it from the dashboard without a redeploy.
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string,
  secret?: string
): Stripe.Event | null {
  const stripe = getStripe();
  const webhookSecret = secret ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return null;

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );
}

/**
 * Resolve the Stripe webhook secret.
 * Priority: STRIPE_WEBHOOK_SECRET env var → Setting `stripe.webhookSecret`.
 */
export async function resolveStripeWebhookSecret(): Promise<string | null> {
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }
  try {
    const setting = await db.setting.findUnique({
      where: { key: "stripe.webhookSecret" },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
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
