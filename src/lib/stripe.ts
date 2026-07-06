import Stripe from "stripe";
import { db } from "./db";

/**
 * Stripe client — initialized lazily with runtime credential override.
 *
 * SECURITY FIX (Phase 5): Previously, wallet/topup/route.ts mutated
 * process.env.STRIPE_SECRET_KEY at runtime to inject credentials from the
 * PaymentMethod.config (DB-stored admin-configured credentials). This was
 * thread-unsafe and persisted across requests.
 *
 * Now: setStripeCredentials() sets a module-level variable that getStripe()
 * checks before falling back to process.env. The override is per-request
 * (call clearStripeCredentials() at the end of the request).
 */

let stripeInstance: Stripe | null = null;
let runtimeSecretKey: string | null = null;
let runtimeWebhookSecret: string | null = null;

/**
 * Set runtime credentials (from DB-stored PaymentMethod.config).
 * Call this at the start of a request that needs DB-stored Stripe creds.
 * Call clearStripeCredentials() at the end of the request.
 */
export function setStripeCredentials(creds: { secretKey?: string; webhookSecret?: string }) {
  runtimeSecretKey = creds.secretKey ?? null;
  runtimeWebhookSecret = creds.webhookSecret ?? null;
  // Clear cached instance so it re-initializes with new creds
  stripeInstance = null;
}

/**
 * Clear runtime credentials — call at the end of a request.
 */
export function clearStripeCredentials() {
  runtimeSecretKey = null;
  runtimeWebhookSecret = null;
  stripeInstance = null;
}

/**
 * Get the active Stripe secret key (runtime override or env var).
 */
function getSecretKey(): string | null {
  return runtimeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? null;
}

/**
 * Get the active Stripe webhook secret (runtime override or env var or DB Setting).
 */
export function getWebhookSecret(): string | null {
  return runtimeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

export function getStripe(): Stripe | null {
  const key = getSecretKey();
  if (!key) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    });
  }
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!getSecretKey();
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
 * Priority: runtime override → STRIPE_WEBHOOK_SECRET env var → Setting `stripe.webhookSecret`.
 */
export async function resolveStripeWebhookSecret(): Promise<string | null> {
  // Check runtime override first (set by setStripeCredentials)
  const runtime = getWebhookSecret();
  if (runtime) return runtime;

  // Check env var
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }

  // Check DB Setting (admin-configurable)
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
