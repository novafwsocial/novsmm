import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, getBaseUrl, audit } from "@/lib/api-utils";
import { topupSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { createNowPaymentsInvoice } from "@/lib/nowpayments";
import { decryptJSON } from "@/lib/crypto-utils";
import { nextPublicId } from "@/lib/ids";
import { cacheInvalidate } from "@/lib/cache";

/**
 * POST /api/wallet/topup — process a payment and credit the wallet.
 *
 * Dispatch logic per payment method:
 *
 *  • Stripe          → if creds.secretKey set  → real Checkout Session (returns checkoutUrl)
 *  • PayPal          → if creds.clientId + clientSecret → create PayPal order,
 *                                                          return { provider, checkoutUrl }
 *  • Mercado Pago    → if creds.accessToken    → create MP preference,
 *                                                 return { provider, checkoutUrl }
 *  • NowPayments     → if creds.apiKey            → create NowPayments invoice,
 *                                                          return { provider, checkoutUrl }
 *  • Manual          → always pending — user contacts support via WhatsApp,
 *                                                 admin credits manually after payment
 *
 * SECURITY (OWASP A04-1): There is NO sandbox fallback. Any payment method
 * that doesn't match one of the 5 branches above (or whose credentials are
 * missing/undecryptable) is rejected with HTTP 422. The wallet is NEVER
 * credited without a real payment confirmation (webhook or admin approval).
 *
 * For external checkout providers (PayPal / Mercado Pago / NowPayments),
 * the wallet is NOT credited here — the provider's webhook handles that when
 * payment confirms. For Manual, an admin manually credits the balance after
 * confirming payment via WhatsApp/Zelle/Wire.
 *
 * 
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

    // Create pending transaction (for all paths — we record every attempt)
    const publicId = await nextPublicId("TX", 8842);
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

    // ── 1. PayPal ──
    // The webhook at /api/webhooks/paypal will verify the signature via
    // PayPal's verify-webhook-signature API and credit the wallet on
    // PAYMENT.CAPTURE.COMPLETED. We pass the txn publicId as the order's
    // custom_id so the webhook can reconcile.
    if (pm.name === "PayPal" && creds?.clientId && creds?.clientSecret) {
      try {
        const paypalResult = await createPaypalOrder({
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
          amount,
          reference: txn.publicId,
          returnUrl: `${origin}/?topup=success`,
          cancelUrl: `${origin}/?topup=cancelled`,
        });
        if (paypalResult?.checkoutUrl && paypalResult?.orderId) {
          // Persist the PayPal order id for webhook reconciliation
          await db.transaction.update({
            where: { id: txn.id },
            data: {
              reference: `paypal:${paypalResult.orderId}`,
              description: `Top-up via PayPal (pending order ${paypalResult.orderId})`,
            },
          });
          // Do NOT credit — the PayPal webhook will confirm & credit.
          return apiOk({
            provider: "paypal",
            checkoutUrl: paypalResult.checkoutUrl,
            orderId: paypalResult.orderId,
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

    // ── 4. NowPayments ──
    // NowPayments is the crypto gateway (replaces the legacy "Crypto" method).
    // It accepts 100+ cryptos (BTC, ETH, USDT, USDC, DAI, etc.) with automatic
    // conversion. Sends a POST request to the NowPayments API with the API key,
    // amount,
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

    // ── 5. Manual payment (WhatsApp / Zelle / Wire) ──
    // User contacts support via WhatsApp (or pays via Zelle/Wire) to arrange
    // a manual credit. The transaction stays "pending" until an admin
    // manually credits it via the admin panel after confirming payment.
    // We return a WhatsApp deep link pre-filled with the reference number so
    // the user can contact us immediately.
    if (pm.name === "Manual") {
      // Fetch WhatsApp number from settings (fallback to default)
      const waSetting = await db.setting.findUnique({ where: { key: "platform.whatsapp" } });
      const whatsappNumber = waSetting?.value ?? "5215512345678";

      const message = `Hello NOVSMM team, I'd like to manually top up $${amount.toFixed(2)} USD to my wallet (reference ${txn.publicId}). Please assist me with the payment instructions (WhatsApp / Zelle / Wire).`;
      const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      // Create pending transaction — user must contact support to complete
      await db.transaction.update({
        where: { id: txn.id },
        data: {
          status: "pending",
          reference: `manual:${txn.publicId}`,
          description: `Manual top-up request — contact support via WhatsApp with reference ${txn.publicId}`,
        },
      });

      // Notify the user about the pending request
      await createNotification({
        userId,
        type: "recharge",
        title: "Manual top-up requested",
        message: `Your manual top-up of $${amount.toFixed(2)} is pending. Reference ${txn.publicId}. Send the payment via WhatsApp/Zelle/Wire and provide this reference number to our team.`,
        amount,
        severity: "info",
      });

      await cacheInvalidate(`dashboard:${userId}:*`).catch(() => {});
      return apiOk({
        provider: "manual",
        reference: txn.publicId,
        whatsappUrl: waUrl,
        transaction: { id: txn.id, publicId: txn.publicId, status: "pending" },
        message: "Manual top-up request created. Contact us via WhatsApp to complete the payment.",
        instructions: "Send the payment via WhatsApp/Zelle/Wire and provide this reference number to our team.",
      });
    }

    // ── 6. Unconfigured / unknown payment method ──
    // SECURITY FIX (OWASP A04-1, P0): Previously this fell back to a sandbox
    // simulator that credited the user's balance with NO real payment — a
    // free-money tap. Any payment method that didn't match one of the 5
    // explicit branches above, OR a known method whose credentials were
    // missing/failed to decrypt, would land here and grant free credit.
    //
    // Now we fail-closed: mark the transaction failed and return an error
    // instructing the user to contact support. There is NO path that credits
    // the wallet without going through a real payment provider webhook (or
    // admin manual approval for the Manual method).
    await db.transaction.update({
      where: { id: txn.id },
      data: {
        status: "failed",
        description: `Top-up failed — payment method "${pm.name}" not properly configured.`,
      },
    });

    await audit(userId, "create", "transaction", txn.id, {
      type: "topup_failed",
      amount,
      method: pm.name,
      reason: "no_matching_payment_branch",
    });

    return apiError(
      `Payment method "${pm.name}" is not properly configured. Please contact support or choose another payment method.`,
      422
    );
  } catch (e: any) {
    console.error("[wallet/topup] error:", e);
    return apiError("Top-up failed", 500);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// External gateway helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a PayPal order via the v2 checkout API.
 * Returns the approve URL the buyer should be redirected to AND the order id
 * (which we persist in txn.reference as `paypal:<orderId>` so the webhook can
 * reconcile the payment).
 *
 * The `reference` (txn publicId) is sent as `custom_id` on the purchase unit.
 * PayPal echoes `custom_id` back in webhook payloads (resource.custom_id),
 * which is how /api/webhooks/paypal finds the transaction to credit.
 */
async function createPaypalOrder(params: {
  clientId: string;
  clientSecret: string;
  amount: number;
  reference: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; orderId: string } | null> {
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
          custom_id: params.reference,
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
  const orderId: string | undefined = data.id;
  if (!approveLink || !orderId) return null;
  return { checkoutUrl: approveLink, orderId };
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
        return "https://novsmm.shop/topup/success";
      }
      // Remove query params (some cause validation errors)
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return "https://novsmm.shop/topup/success";
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
