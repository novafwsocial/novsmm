import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, getBaseUrl } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { getStripe, createCheckoutSession } from "@/lib/stripe";
import { nextPublicId } from "@/lib/ids";

const PLANS: Record<string, {
  amount: number;
  name: string;
  features: string[];
  seatsLimit: number;
}> = {
  starter: {
    amount: 29,
    name: "Starter",
    features: ["1K orders/mo", "5 platforms", "Email support"],
    seatsLimit: 1,
  },
  growth: {
    amount: 89,
    name: "Growth",
    features: ["25K orders/mo", "Unlimited platforms", "Priority support", "Crypto payouts"],
    seatsLimit: 10,
  },
  enterprise: {
    amount: 299,
    name: "Enterprise",
    features: ["Unlimited orders", "Audit logs + CSV export", "Custom SLA"],
    seatsLimit: 100,
  },
};

/**
 * Stripe Price IDs per plan + billing cycle.
 * Read from env vars (STRIPE_PRICE_STARTER_MONTHLY, STRIPE_PRICE_STARTER_YEARLY, etc.).
 * If none are set, the API runs in sandbox mode (creates a local subscription immediately).
 *
 * Example .env:
 *   STRIPE_PRICE_STARTER_MONTHLY=price_1OkL...
 *   STRIPE_PRICE_STARTER_YEARLY=price_1OkL...
 *   STRIPE_PRICE_GROWTH_MONTHLY=price_1OkL...
 *   STRIPE_PRICE_GROWTH_YEARLY=price_1OkL...
 *   STRIPE_PRICE_ENTERPRISE_MONTHLY=price_1OkL...
 *   STRIPE_PRICE_ENTERPRISE_YEARLY=price_1OkL...
 */
const PLAN_PRICES: Record<string, { monthly?: string; yearly?: string }> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
  },
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
    yearly: process.env.STRIPE_PRICE_GROWTH_YEARLY,
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  },
};

/** Returns true if any Stripe Price ID env var is configured. */
function isStripeBillingConfigured(): boolean {
  return Object.values(PLAN_PRICES).some(
    (c) => !!c.monthly || !!c.yearly
  );
}

/**
 * GET /api/subscriptions — user's current subscription + available plans.
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const subscription = await db.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    orderBy: { createdAt: "desc" },
  });

  return apiOk({
    subscription,
    seats: subscription
      ? { used: subscription.seatsUsed, limit: subscription.seatsLimit }
      : null,
    plans: Object.entries(PLANS).map(([id, p]) => ({
      id,
      name: p.name,
      amount: p.amount,
      features: p.features,
      seatsLimit: p.seatsLimit,
    })),
  });
}

/**
 * POST /api/subscriptions — subscribe to a plan.
 *
 * Body: { planId: "starter"|"growth"|"enterprise", billingCycle?: "monthly"|"yearly" }
 *
 * Production (Stripe Billing configured via STRIPE_PRICE_* env vars):
 *   Creates a Stripe Checkout Session in `subscription` mode and returns
 *   `{ checkoutUrl }`. The browser redirects there; the webhook
 *   (`checkout.session.completed`) creates the local Subscription record.
 *
 * Sandbox (no Stripe Price IDs configured):
 *   Creates a local subscription record immediately and returns it.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { planId, billingCycle = "monthly" } = body;

  const plan = PLANS[planId];
  if (!plan) return apiError("Invalid plan", 422);

  if (billingCycle !== "monthly" && billingCycle !== "yearly") {
    return apiError("billingCycle must be 'monthly' or 'yearly'", 422);
  }

  // Check for existing active subscription
  const existing = await db.subscription.findFirst({
    where: { userId, status: "active" },
  });
  if (existing) {
    return apiError("You already have an active subscription. Cancel it first.", 409);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  // ── Real Stripe Billing flow (when configured) ──
  const priceId = PLAN_PRICES[planId]?.[billingCycle];
  const stripe = getStripe();
  if (stripe && priceId && isStripeBillingConfigured()) {
    const origin = await getBaseUrl();
    try {
      const checkout = await createCheckoutSession({
        priceId,
        userId,
        customerEmail: user?.email ?? "",
        successUrl: `${origin}/?sub=success`,
        cancelUrl: `${origin}/?sub=cancelled`,
      });
      if (checkout?.url) {
        return apiOk({
          checkoutUrl: checkout.url,
          sessionId: checkout.id,
          provider: "stripe",
          mode: "subscription",
        });
      }
      // If checkout creation returned no URL, fall through to sandbox.
      console.warn("[subscriptions] Stripe checkout returned no URL — falling back to sandbox");
    } catch (e: any) {
      console.error("[subscriptions] Stripe checkout failed:", e?.message);
      return apiError(`Failed to start checkout: ${e?.message ?? "unknown error"}`, 502);
    }
  } else if (isStripeBillingConfigured() && !priceId) {
    return apiError(
      `No Stripe price configured for plan "${planId}" (${billingCycle}). Set STRIPE_PRICE_${planId.toUpperCase()}_${billingCycle.toUpperCase()}.`,
      500
    );
  } else if (isStripeBillingConfigured() && !stripe) {
    console.warn("[subscriptions] STRIPE_PRICE_* set but STRIPE_SECRET_KEY missing — sandbox");
  }

  // ── Sandbox: create local subscription ──
  const now = new Date();
  const periodEnd =
    billingCycle === "yearly"
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const subscription = await db.subscription.create({
    data: {
      userId,
      plan: planId,
      status: "active",
      amount: plan.amount,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      // The subscription owner occupies the first seat. Team-member invites
      // (not yet implemented) will increment `seatsUsed` up to `seatsLimit`.
      seatsUsed: 1,
      seatsLimit: plan.seatsLimit,
    },
  });

  // Upgrade the user's plan
  await db.user.update({
    where: { id: userId },
    data: { plan: planId },
  });

  // Create invoice
  const invoicePublicId = await nextPublicId("INV", 0, 4);
  await db.invoice.create({
    data: {
      publicId: invoicePublicId,
      userId,
      type: "subscription",
      amount: plan.amount,
      tax: 0,
      total: plan.amount,
      currency: "USD",
      status: "paid",
      // items is now a Json column — pass the array directly (no JSON.stringify).
      items: [{ description: `${plan.name} plan — ${billingCycle}`, quantity: 1, unitPrice: plan.amount, total: plan.amount }],
    },
  });

  await createNotification({
    userId,
    type: "system",
    title: `Subscribed to ${plan.name} 🎉`,
    message: `Your ${plan.name} subscription is active. Next billing: ${periodEnd.toLocaleDateString()}`,
    amount: -plan.amount,
    severity: "success",
    sendEmail: true,
  });

  return apiOk({ subscription, message: `Subscribed to ${plan.name}` }, 201);
}

/**
 * DELETE /api/subscriptions — cancel subscription.
 */
export async function DELETE() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const subscription = await db.subscription.findFirst({
    where: { userId, status: "active" },
  });
  if (!subscription) return apiError("No active subscription", 404);

  await db.subscription.update({
    where: { id: subscription.id },
    data: { status: "canceled", cancelAtPeriodEnd: true },
  });

  await createNotification({
    userId,
    type: "system",
    title: "Subscription canceled",
    message: `Your ${subscription.plan} subscription will remain active until ${subscription.currentPeriodEnd?.toLocaleDateString() ?? "the end of the period"}.`,
    severity: "warning",
    sendEmail: true,
  });

  return apiOk({ message: "Subscription canceled" });
}
