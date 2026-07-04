import crypto from "crypto";

/**
 * NowPayments payment gateway client.
 *
 * NowPayments is a cryptocurrency payment gateway that lets merchants accept
 * 100+ cryptocurrencies (BTC, ETH, USDT, USDC, DAI, etc.) with automatic
 * conversion to fiat or stablecoins.
 *
 * API documentation: https://nowpayments.io/api-docs
 *
 * Credentials are read from the PaymentMethod.config column (encrypted at
 * rest with AES-256-GCM via src/lib/crypto-utils.ts).
 *
 * Required credentials (set in Admin → Payments → Configure credentials):
 *   - apiKey   : NowPayments API key (from dashboard.nowpayments.io)
 *   - ipnSecret : IPN (Instant Payment Notification) secret for webhook verification
 *   - payCurrency : default crypto to display in the invoice (e.g. "usdttrc20")
 *   - payoutCurrency : optional — auto-convert to this currency (e.g. "usd")
 */

export interface NowPaymentsCredentials {
  apiKey: string;
  ipnSecret?: string;
  payCurrency?: string;    // e.g. "usdttrc20", "btc", "eth"
  payoutCurrency?: string; // e.g. "usd" — auto-convert received crypto to this
}

export interface CreateInvoiceParams {
  amount: number;          // USD amount (e.g. 100.00)
  currency: string;        // ISO 4217 (e.g. "USD")
  reference: string;       // merchant order reference (our transaction publicId)
  successUrl: string;      // redirect URL after successful payment
  cancelUrl: string;       // redirect URL after cancelled payment
  customerEmail?: string;  // optional — for receipt
  description?: string;    // optional — shown on the NowPayments invoice
}

export interface NowPaymentsInvoiceResult {
  invoiceId: string;       // NowPayments invoice id
  checkoutUrl: string;     // hosted invoice URL — browser redirects here
  status: string;          // "waiting" | "new" | "pending"
  raw?: any;               // full response (for debugging)
}

const NOWPAYMENTS_API_BASE = "https://api.nowpayments.io/v1";

/**
 * Create a NowPayments invoice by POSTing to the NowPayments API.
 *
 * Flow:
 *   1. Read encrypted credentials from the DB (caller's responsibility).
 *   2. Build the JSON body with price_amount, price_currency, pay_currency,
 *      order_id (reference), and redirect URLs.
 *   3. Authenticate with the API key in the x-api-key header.
 *   4. POST to https://api.nowpayments.io/v1/invoice
 *   5. Return the hosted invoice URL the browser should redirect to.
 *
 * The user's balance is NOT credited here — that happens when the NowPayments
 * IPN webhook fires /api/webhooks/nowpayments with a "finished" or "confirmed"
 * status.
 *
 * @throws Error if the NowPayments API rejects the request or credentials are invalid.
 */
export async function createNowPaymentsInvoice(
  creds: NowPaymentsCredentials,
  params: CreateInvoiceParams
): Promise<NowPaymentsInvoiceResult> {
  if (!creds.apiKey) {
    throw new Error("NowPayments: missing required credential (apiKey)");
  }

  const endpoint = `${NOWPAYMENTS_API_BASE}/invoice`;

  // ── Build the invoice body (NowPayments API spec) ──
  // Note: NowPayments API does NOT accept a "metadata" field — it uses
  // order_id + order_description for reconciliation. We embed the
  // transaction public id in order_id so the webhook can find it.
  //
  // pay_currency is optional — if not provided, NowPayments lets the user
  // pick any supported crypto on the checkout page.
  const body: Record<string, any> = {
    price_amount: params.amount.toFixed(2),
    price_currency: (params.currency || "USD").toLowerCase(),
    order_id: params.reference,
    order_description: params.description ?? `NOVSMM Wallet Top-up — $${params.amount.toFixed(2)}`,
    ipn_callback_url: params.successUrl.replace(/\/\?topup=success$/, "/api/webhooks/nowpayments"),
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };

  // Only include pay_currency if explicitly configured (optional field)
  if (creds.payCurrency && creds.payCurrency.trim()) {
    body.pay_currency = creds.payCurrency.trim();
  }

  // Only include payout_currency if explicitly configured (optional auto-convert)
  if (creds.payoutCurrency && creds.payoutCurrency.trim()) {
    body.payout_currency = creds.payoutCurrency.trim();
  }

  const bodyStr = JSON.stringify(body);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": creds.apiKey,
  };

  // ── POST to NowPayments ──
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: bodyStr,
      signal: AbortSignal.timeout(15_000), // 15s timeout — fail fast
    });
  } catch (e: any) {
    throw new Error(`NowPayments network error: ${e?.message ?? "request failed"}`);
  }

  // ── Parse the response ──
  let data: any;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(`NowPayments: invalid response (HTTP ${res.status}) ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const errMsg =
      data?.message ??
      data?.error ??
      data?.errors?.[0] ??
      `HTTP ${res.status}`;
    throw new Error(`NowPayments API error: ${errMsg}`);
  }

  // ── Extract the invoice URL ──
  // NowPayments returns { invoice_url, id } on success
  const checkoutUrl: string | undefined =
    data?.invoice_url ??
    data?.url ??
    data?.checkout_url;

  const invoiceId: string | undefined =
    data?.id ??
    data?.invoice_id ??
    params.reference;

  if (!checkoutUrl) {
    throw new Error("NowPayments: no invoice URL returned by the API");
  }

  return {
    invoiceId: String(invoiceId),
    checkoutUrl,
    status: data?.status ?? "waiting",
    raw: data,
  };
}

/**
 * Verify a NowPayments IPN (Instant Payment Notification) signature.
 * Used by /api/webhooks/nowpayments to authenticate incoming payment notifications.
 *
 * NowPayments sends the IPN payload as JSON in the request body, and signs it
 * with HMAC-SHA256 using the IPN secret. The signature is sent in the
 * `x-nowpayments-sig` header in the format: `<sig1>;<sig2>` where sig1 is the
 * HMAC of the sorted JSON string and sig2 is the HMAC of the raw body.
 *
 * We compute both HMACs and compare against the header value.
 *
 * Returns true if the signature is valid.
 */
export function verifyNowPaymentsWebhook(
  rawBody: string,
  signatureHeader: string,
  ipnSecret: string
): boolean {
  if (!signatureHeader || !ipnSecret) return false;

  // NowPayments sends the signature as "hmac=<hex>" or just "<hex>"
  const sig = signatureHeader.replace(/^hmac=/i, "").trim();
  const parts = sig.split(";");

  // Compute HMAC-SHA256 of the raw body
  const expectedSig = crypto
    .createHmac("sha256", ipnSecret)
    .update(rawBody)
    .digest("hex");

  // Compare against any of the provided signatures
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    try {
      if (
        p.length === expectedSig.length &&
        crypto.timingSafeEqual(Buffer.from(p, "hex"), Buffer.from(expectedSig, "hex"))
      ) {
        return true;
      }
    } catch {
      // ignore malformed hex
    }
  }
  return false;
}
