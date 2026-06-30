import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

const PLANS: Record<string, { amount: number; name: string; features: string[] }> = {
  starter: { amount: 29, name: "Starter", features: ["1K orders/mo", "5 platforms", "Email support"] },
  growth: { amount: 89, name: "Growth", features: ["25K orders/mo", "Unlimited platforms", "Priority support", "Crypto payouts"] },
  enterprise: { amount: 299, name: "Enterprise", features: ["Unlimited orders", "Dedicated infra", "SSO + audit logs", "Custom SLA"] },
};

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
    plans: Object.entries(PLANS).map(([id, p]) => ({
      id,
      name: p.name,
      amount: p.amount,
      features: p.features,
    })),
  });
}

/**
 * POST /api/subscriptions — subscribe to a plan.
 * In production, this creates a Stripe Checkout session for recurring billing.
 * Without Stripe, it creates a local subscription record (sandbox).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { planId } = body;

  const plan = PLANS[planId];
  if (!plan) return apiError("Invalid plan", 422);

  // Check for existing active subscription
  const existing = await db.subscription.findFirst({
    where: { userId, status: "active" },
  });
  if (existing) {
    return apiError("You already have an active subscription. Cancel it first.", 409);
  }

  // ── Real Stripe flow (when configured) ──
  // const stripe = getStripe();
  // if (stripe) {
  //   const session = await stripe.checkout.sessions.create({
  //     mode: "subscription",
  //     line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
  //     success_url: `${URL}/?subscription=success`,
  //     cancel_url: `${URL}/?subscription=cancel`,
  //     client_reference_id: userId,
  //   });
  //   return apiOk({ checkoutUrl: session.url });
  // }

  // ── Sandbox: create local subscription ──
  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const subscription = await db.subscription.create({
    data: {
      userId,
      plan: planId,
      status: "active",
      amount: plan.amount,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // Create invoice
  const invoiceCount = await db.invoice.count();
  await db.invoice.create({
    data: {
      publicId: `INV-${String(invoiceCount + 1).padStart(4, "0")}`,
      userId,
      type: "subscription",
      amount: plan.amount,
      tax: 0,
      total: plan.amount,
      currency: "USD",
      status: "paid",
      items: JSON.stringify([{ description: `${plan.name} plan — monthly`, quantity: 1, unitPrice: plan.amount, total: plan.amount }]),
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
