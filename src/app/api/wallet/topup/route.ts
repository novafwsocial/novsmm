import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, getBaseUrl } from "@/lib/api-utils";
import { topupSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { isStripeConfigured, createTopupCheckoutSession } from "@/lib/stripe";
import { createNowPaymentsInvoice } from "@/lib/nowpayments";
import { decryptJSON } from "@/lib/crypto-utils";

/**
 * POST /api/wallet/topup — process a payment and credit the wallet.
 *
 * Dispatch logic per payment method:
 *
 *  • Stripe          → if creds.secretKey set  → real PaymentIntent (returns clientSecret)
 *                      else                    → sandbox (credit immediately)
 *  • PayPal          → if creds.clientId + clientSecret → create PayPal order,
 *                                                          return { provider, checkoutUrl }
 *                      else                    → sandbox
 *  • Mercado Pago    → if creds.accessToken    → create MP preference,
 *                                                 return { provider, checkoutUrl }
 *                      else                    → sandbox
 *  • Crypto (USDT)   → if creds.walletAddress  → return { provider, address, network,
 *                                                          amount, expectedConfirmations }
 *                      else                    → sandbox
 *  • Legacy methods /
 *    Bank transfer   → always sandbox (simulated)
 *
 * For external checkout providers (PayPal / Mercado Pago), the wallet is NOT
 * credited here — the provider's webhook handles that when payment confirms.
 * For Crypto, an off-chain confirmation worker (or manual admin verification)
 * credits the balance once the expected confirmations are seen.
 *
 * Backward compatibility: the previous Stripe PaymentIntent response shape
 * (with `clientSecret` + `paymentIntentId`) is preserved.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = topupSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { amount, method, reference } = parsed.data;

    // Validate payment method exists and is active
    const pm = await db.paymentMethod.findFirst({
      where: { name: method, status: "active" },
    });
    if (!pm) {
      return apiError("Payment method unavailable", 404);
    }

    // Decrypt credentials (if any)
    let creds: Record<string, any> | null = null;
    if (pm.config) {
      creds = decryptJSON(pm.config);
    }
    const hasCreds = !!creds && Object.keys(creds).length > 0;

    // ── For Stripe: push creds into env so stripe.ts can pick them up ──
    if (pm.name === "Stripe" && creds?.secretKey) {
      process.env.STRIPE_SECRET_KEY = creds.secretKey;
      if (creds.webhookSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = creds.webhookSecret;
      }
    }

    // Create pending transaction (for all paths — we record every attempt)
    const txnCount = await db.transaction.count();
    const publicId = `TX-${8842 + txnCount}`;
    const methodSlug = pm.name.toLowerCase().replace(/\s/g, "_");
    const txn = await db.transaction.create({
      data: {
        publicId,
        userId,
        type: "topup",
        amount,
        description: `Top-up via ${pm.name}`,
        status: "pending",
        method: methodSlug,
        reference: reference ?? `pi_${Date.now()}`,
      },
    });

    const origin = await getBaseUrl();

    // ──────────────────────────────────────────────────────────────────
    //  Per-method dispatch
    // ──────────────────────────────────────────────────────────────────

    // ── 1. Stripe ──
    // Uses Stripe Checkout Session (hosted by Stripe). The browser redirects
    // to session.url, the user pays on Stripe's page, then Stripe redirects
    // back to successUrl. The webhook (checkout.session.completed) credits
    // the balance — we do NOT credit here.
    if (pm.name === "Stripe" && (isStripeConfigured() || hasCreds)) {
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        const checkout = await createTopupCheckoutSession({
          amount,
          userId,
          customerEmail: user?.email ?? "",
          transactionPublicId: txn.publicId,
          successUrl: `${origin}/?topup=success`,
          cancelUrl: `${origin}/?topup=cancelled`,
        });

        if (checkout?.url) {
          // Update transaction with Stripe session id for traceability
          await db.transaction.update({
            where: { id: txn.id },
            data: {
              reference: checkout.id,
              description: `Top-up via Stripe (pending checkout ${checkout.id})`,
            },
          });

          return apiOk({
            provider: "stripe",
            checkoutUrl: checkout.url,
            sessionId: checkout.id,
            transaction: { id: txn.id, publicId: txn.publicId, status: "pending" },
            message: "Redirecting to Stripe Checkout to complete payment.",
          });
        }

        // No URL returned (rare) — return a clear error, don't fall back to sandbox
        await db.transaction.update({
          where: { id: txn.id },
          data: { status: "failed" },
        });
        return apiError(
          "Stripe Checkout could not be created. Verify your Stripe credentials in Admin → Payments.",
          502
        );
      } catch (stripeError: any) {
        console.error("[wallet/topup] Stripe Checkout error:", stripeError?.message);
        await db.transaction.update({
          where: { id: txn.id },
          data: { status: "failed" },
        });
        // Return a clear error — do NOT fall back to sandbox when Stripe is configured
        return apiError(
          `Stripe error: ${stripeError?.message ?? "Failed to create checkout session"}. Check Admin → Payments → Configure credentials.`,
          502
        );
      }
    }

    // ── 2. PayPal ──
    if (pm.name === "PayPal" && creds?.clientId && creds?.clientSecret) {
      try {
        const checkoutUrl = await createPaypalOrder({
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
          amount,
          returnUrl: `${origin}/?topup=success`,
          cancelUrl: `${origin}/?topup=cancelled`,
        });
        if (checkoutUrl) {
          // Do NOT credit — the PayPal webhook will confirm & credit.
          return apiOk({
            provider: "paypal",
            checkoutUrl,
            transaction: { id: txn.id, publicId: txn.publicId, status: "pending" },
            message: "Redirect to PayPal to complete payment.",
          });
        }
        console.warn("[wallet/topup] PayPal order creation returned no approve URL — sandbox");
      } catch (e: any) {
        console.error("[wallet/topup] PayPal order creation failed:", e?.message);
        await db.transaction.update({
          where: { id: txn.id },
          data: { status: "failed" },
        });
        return apiError(`PayPal error: ${e?.message ?? "unknown"}`, 502);
      }
    }

    // ── 3. Mercado Pago ──
    if (pm.name === "Mercado Pago" && creds?.accessToken) {
      try {
        const checkoutUrl = await createMercadoPagoPreference({
          accessToken: creds.accessToken,
          amount,
          successUrl: `${origin}/?topup=success`,
          failureUrl: `${origin}/?topup=cancelled`,
          pendingUrl: `${origin}/?topup=pending`,
        });
        if (checkoutUrl) {
          return apiOk({
            provider: "mercadopago",
            checkoutUrl,
            transaction: { id: txn.id, publicId: txn.publicId, status: "pending" },
            message: "Redirect to Mercado Pago to complete payment.",
          });
        }
        console.warn("[wallet/topup] Mercado Pago preference returned no init_point — sandbox");
      } catch (e: any) {
        console.error("[wallet/topup] Mercado Pago preference failed:", e?.message);
        await db.transaction.update({
          where: { id: txn.id },
          data: { status: "failed" },
        });

        // Parse Mercado Pago error for a clearer user-facing message
        const errMsg = e?.message ?? "";
        let userMessage = "Mercado Pago error. Please try another payment method.";

        // 403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES — account not verified or Checkout Pro not enabled
        if (errMsg.includes("403") && errMsg.includes("PA_UNAUTHORIZED")) {
          userMessage =
            "Mercado Pago account not authorized. The merchant account needs to be verified and have Checkout Pro enabled. Contact support or try another payment method.";
        }
        // 401 invalid_token — access token is invalid or expired
        else if (errMsg.includes("401") || errMsg.includes("invalid_token")) {
          userMessage =
            "Mercado Pago access token is invalid or expired. Admin must update credentials in Admin → Payments → Configure credentials.";
        }
        // 400 validation errors
        else if (errMsg.includes("400")) {
          userMessage =
            "Mercado Pago rejected the payment request. Check that the account is verified and credentials are correct.";
        }

        return apiError(userMessage, 502);
      }
    }

    // ── 4. Crypto (USDT) ──
    if (pm.name === "Crypto" && creds?.walletAddress) {
      const network = creds.network || "TRC20";
      const expectedConfirmations = Number(creds.expectedConfirmations ?? 3);
      // Do NOT credit — an off-chain verification worker (or admin) credits
      // once the expected confirmations are observed on-chain.
      await db.transaction.update({
        where: { id: txn.id },
        data: {
          reference: `crypto:${network}:${creds.walletAddress}`,
          description: `Top-up via Crypto (${network}) — awaiting ${expectedConfirmations} confirmations`,
        },
      });
      return apiOk({
        provider: "crypto",
        address: creds.walletAddress,
        network,
        amount,
        expectedConfirmations,
        transaction: { id: txn.id, publicId: txn.publicId, status: "pending" },
        message: `Send exactly $${amount.toFixed(2)} USDT to the address above on the ${network} network.`,
      });
    }

    // ── 4. NowPayments ──
    // NowPayments is a cryptocurrency payment gateway that accepts 100+ cryptos
    // (BTC, ETH, USDT, USDC, DAI, etc.) with automatic conversion.
    // Sends a POST request to the NowPayments API with the API key, amount,
    // currency, and redirect URLs. NowPayments returns a hosted invoice URL
    // that the browser redirects to. The IPN webhook credits the balance
    // after payment confirmation.
    if (pm.name === "NowPayments" && creds?.apiKey) {
      try {
        // Fetch the user's email so NowPayments can send a receipt
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        // ── Call the NowPayments API to create an invoice ──
        // Credentials are read from the encrypted PaymentMethod.config column.
        // The apiKey authenticates the request via the x-api-key header.
        const invoice = await createNowPaymentsInvoice(
          {
            apiKey: creds.apiKey,
            ipnSecret: creds.ipnSecret,
            payCurrency: creds.payCurrency,
            payoutCurrency: creds.payoutCurrency,
          },
          {
            amount,
            currency: "USD",
            reference: txn.publicId,
            successUrl: `${origin}/?topup=success`,
            cancelUrl: `${origin}/?topup=cancelled`,
            customerEmail: user?.email,
            description: `NOVSMM Wallet Top-up — $${amount.toFixed(2)}`,
          }
        );

        // Persist the NowPayments invoice id for webhook reconciliation
        await db.transaction.update({
          where: { id: txn.id },
          data: {
            reference: `nowpayments:${invoice.invoiceId}`,
            description: `Top-up via NowPayments (pending invoice ${invoice.invoiceId})`,
          },
        });

        return apiOk({
          provider: "nowpayments",
          checkoutUrl: invoice.checkoutUrl,
          invoiceId: invoice.invoiceId,
          transaction: { id: txn.id, publicId: txn.publicId, status: "pending" },
          message: "Redirecting to NowPayments to complete payment.",
        });
      } catch (e: any) {
        console.error("[wallet/topup] NowPayments error:", e?.message);
        await db.transaction.update({
          where: { id: txn.id },
          data: { status: "failed" },
        });
        return apiError(
          `NowPayments error: ${e?.message ?? "Failed to create invoice"}. Verify credentials in Admin → Payments → Configure credentials.`,
          502
        );
      }
    }

    // ── 5. Manual Payment ──
    // User contacts support via WhatsApp to arrange a manual credit.
    // The transaction stays "pending" until an admin manually credits it
    // via the admin panel. We return a WhatsApp link so the user can
    // contact us immediately.
    if (pm.name === "Manual") {
      // Fetch WhatsApp number from settings (fallback to default)
      const waSetting = await db.setting.findUnique({ where: { key: "platform.whatsapp" } });
      const whatsappNumber = waSetting?.value ?? "5215512345678";

      const message = `Hello NOVSMM team, I'd like to manually top up $${amount.toFixed(2)} USD to my wallet (transaction ${txn.publicId}). Please assist me with the payment instructions.`;
      const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      await db.transaction.update({
        where: { id: txn.id },
        data: {
          reference: `manual:${txn.publicId}`,
          description: `Manual top-up — awaiting user to contact support via WhatsApp`,
        },
      });

      // Notify admins about the manual top-up request
      await createNotification({
        userId,
        type: "recharge",
        title: "Manual top-up requested",
        message: `User requested a manual top-up of $${amount.toFixed(2)}. Transaction ${txn.publicId} is pending. Check admin panel to credit manually after receiving payment.`,
        amount,
        severity: "info",
      });

      return apiOk({
        provider: "manual",
        whatsappUrl: waUrl,
        transaction: { id: txn.id, publicId: txn.publicId, status: "pending" },
        message: "Contact us via WhatsApp to complete your manual payment. Your balance will be credited by our team after payment confirmation.",
      });
    }

    // ── 6. Legacy methods / Bank transfer / Crypto / unconfigured methods → sandbox ──
    // (Simulated gateway — credits balance immediately)
    const paymentResult = await processPayment(pm, amount, txn.reference ?? "");

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

    // ── Sandbox success: credit balance atomically ──
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

    await createNotification({
      userId,
      type: "recharge",
      title: "Wallet topped up 💰",
      message: `$${amount.toFixed(2)} credited via ${pm.name}. New balance available immediately.`,
      amount,
      severity: "success",
      sendEmail: true,
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "create",
        entity: "transaction",
        entityId: txn.id,
        metadata: JSON.stringify({ type: "topup", amount, method: pm.name, sandbox: true }),
      },
    });

    return apiOk({
      transaction: await db.transaction.findUnique({ where: { id: txn.id } }),
      provider: "sandbox",
      message: "Top-up successful",
    });
  } catch (e: any) {
    console.error("[wallet/topup] error:", e);
    return apiError("Top-up failed", 500);
  }
}

/**
 * Sandbox payment processor — simulates a gateway with 1.5s delay + 99.5%
 * success rate. Used when no real credentials are configured.
 */
async function processPayment(
  pm: { name: string; config: string | null },
  amount: number,
  reference: string
): Promise<{ success: boolean; reference: string }> {
  await new Promise((r) => setTimeout(r, 1500));

  // 0.5% random failure for realism
  if (Math.random() < 0.005) {
    return { success: false, reference };
  }

  return {
    success: true,
    reference: `${reference}_confirmed`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// External gateway helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a PayPal order via the v2 checkout API.
 * Returns the approve URL the buyer should be redirected to.
 */
async function createPaypalOrder(params: {
  clientId: string;
  clientSecret: string;
  amount: number;
  returnUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  const auth = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
  const res = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: params.amount.toFixed(2) },
          description: "NOVSMM wallet top-up",
        },
      ],
      application_context: {
        brand_name: "NOVSMM",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PayPal API ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  const approveLink = data.links?.find((l: any) => l.rel === "approve")?.href;
  return approveLink ?? null;
}

/**
 * Create a Mercado Pago checkout preference.
 * Returns the `init_point` (production checkout URL).
 *
 * Mercado Pago requires back_urls to be valid HTTPS URLs. If the origin is
 * localhost or http, we omit auto_return (which requires all back_urls) and
 * use clean URLs without query params (MP rejects some query param formats).
 */
async function createMercadoPagoPreference(params: {
  accessToken: string;
  amount: number;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
}): Promise<string | null> {
  // Mercado Pago requires HTTPS for back_urls in production.
  // If the URL is http or localhost, strip it to just the path.
  const sanitizeUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      // MP requires HTTPS — if not HTTPS, return a placeholder
      if (parsed.protocol !== "https:") {
        return "https://novsmm.com/topup/success";
      }
      // Remove query params (some cause validation errors)
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return "https://novsmm.com/topup/success";
    }
  };

  const successUrl = sanitizeUrl(params.successUrl);
  const failureUrl = sanitizeUrl(params.failureUrl);
  const pendingUrl = sanitizeUrl(params.pendingUrl);

  // Only set auto_return if all back_urls are HTTPS (MP requirement)
  const allHttps =
    successUrl.startsWith("https://") &&
    failureUrl.startsWith("https://") &&
    pendingUrl.startsWith("https://");

  const body: Record<string, any> = {
    items: [
      {
        title: "NOVSMM wallet top-up",
        quantity: 1,
        unit_price: params.amount,
        currency_id: "USD",
      },
    ],
    back_urls: {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
    },
    statement_descriptor: "NOVSMM",
  };

  // auto_return only works when back_urls are all valid HTTPS
  if (allHttps) {
    body.auto_return = "approved";
  }

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mercado Pago API ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  return data.init_point ?? data.sandbox_init_point ?? null;
}
