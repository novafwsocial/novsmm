import crypto from "crypto";

/**
 * AURPay payment gateway client.
 *
 * Sends a POST request to the AURPay API to create a payment order, then
 * returns the hosted checkout URL the browser should be redirected to.
 *
 * Credentials are read from the PaymentMethod.config column (encrypted at
 * rest with AES-256-GCM via src/lib/crypto-utils.ts). They are NEVER logged
 * or exposed to the client.
 *
 * Required credentials (set in Admin → Payments → Configure credentials):
 *   - merchantId : AUR-MER-...
 *   - apiKey     : aur_pk_...
 *   - apiSecret  : aur_sk_...
 *   - apiUrl     : https://checkout.aurpay.com  (hosted checkout base URL)
 *   - webhookSecret : whsec_...  (used by /api/webhooks/aurpay to verify callbacks)
 */

export interface AurpayCredentials {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  apiUrl?: string;        // hosted checkout base URL (default: https://checkout.aurpay.com)
  webhookSecret?: string; // used for webhook signature verification
}

export interface CreateOrderParams {
  amount: number;          // USD amount (e.g. 100.00)
  currency: string;        // ISO 4217 (e.g. "USD")
  reference: string;       // merchant order reference (our transaction publicId)
  successUrl: string;      // redirect URL after successful payment
  cancelUrl: string;       // redirect URL after cancelled payment
  customerEmail?: string;  // optional — pre-fills the checkout form
  description?: string;    // optional — shown on the AURPay checkout page
}

export interface AurpayOrderResult {
  orderId: string;         // AURPay order id
  checkoutUrl: string;     // hosted checkout URL — browser redirects here
  status: string;          // "pending" | "created"
  raw?: any;               // full response (for debugging)
}

/**
 * Resolve the AURPay API base URL. Defaults to the official endpoint.
 * Admins can override per-merchant via the `apiUrl` credential field.
 */
function resolveApiHost(apiUrl?: string): string {
  if (apiUrl && apiUrl.trim()) {
    // Normalize: strip trailing slash, keep protocol
    return apiUrl.trim().replace(/\/+$/, "");
  }
  return "https://checkout.aurpay.com";
}

/**
 * Build an HMAC-SHA256 signature for the AURPay request.
 * AURPay signs requests using: HMAC(apiSecret, timestamp + "." + body)
 * The server re-computes the signature and compares it.
 */
function signRequest(
  apiSecret: string,
  timestamp: number,
  body: string
): string {
  const payload = `${timestamp}.${body}`;
  return crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");
}

/**
 * Create an AURPay payment order by POSTing to the AURPay API.
 *
 * Flow:
 *   1. Read encrypted credentials from the DB (caller's responsibility).
 *   2. Build the JSON body with amount, currency, reference, redirect URLs.
 *   3. Sign the request with HMAC-SHA256 using the apiSecret.
 *   4. POST to {apiUrl}/api/v1/orders
 *   5. Return the hosted checkout URL the browser should redirect to.
 *
 * The user's balance is NOT credited here — that happens when the AURPay
 * webhook fires /api/webhooks/aurpay with a "payment.succeeded" event.
 *
 * @throws Error if the AURPay API rejects the request or credentials are invalid.
 */
export async function createAurpayOrder(
  creds: AurpayCredentials,
  params: CreateOrderParams
): Promise<AurpayOrderResult> {
  if (!creds.merchantId || !creds.apiKey || !creds.apiSecret) {
    throw new Error("AURPay: missing required credentials (merchantId, apiKey, apiSecret)");
  }

  const apiHost = resolveApiHost(creds.apiUrl);
  const endpoint = `${apiHost}/api/v1/orders`;

  // ── Build the order body ──
  // Amount is sent in the smallest currency unit (cents) — standard practice
  // for payment gateways (PayPal, etc. all do this).
  const amountInCents = Math.round(params.amount * 100);

  const body = JSON.stringify({
    merchant_id: creds.merchantId,
    amount: amountInCents,
    currency: (params.currency || "USD").toUpperCase(),
    reference: params.reference,
    description: params.description ?? `NOVSMM Wallet Top-up — $${params.amount.toFixed(2)}`,
    return_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    // Metadata helps the webhook reconcile the payment back to our transaction
    metadata: {
      source: "novsmm_wallet_topup",
      transaction_public_id: params.reference,
      amount_usd: String(params.amount),
    },
  });

  // ── Sign the request ──
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signRequest(creds.apiSecret, timestamp, body);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-AURPay-Merchant": creds.merchantId,
    "X-AURPay-Key": creds.apiKey,
    "X-AURPay-Timestamp": String(timestamp),
    "X-AURPay-Signature": signature,
  };

  // ── POST to AURPay ──
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15_000), // 15s timeout — fail fast
    });
  } catch (e: any) {
    throw new Error(`AURPay network error: ${e?.message ?? "request failed"}`);
  }

  // ── Parse the response ──
  let data: any;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(`AURPay: invalid response (HTTP ${res.status}) ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const errMsg = data?.error?.message ?? data?.message ?? data?.error ?? `HTTP ${res.status}`;
    throw new Error(`AURPay API error: ${errMsg}`);
  }

  // ── Extract the checkout URL ──
  // AURPay returns either { checkout_url } or { data: { checkout_url } }
  // We handle both shapes for forward-compatibility.
  const checkoutUrl: string | undefined =
    data?.checkout_url ??
    data?.data?.checkout_url ??
    data?.payment_url ??
    data?.data?.payment_url ??
    data?.url;

  const orderId: string | undefined =
    data?.order_id ??
    data?.data?.order_id ??
    data?.id ??
    data?.data?.id ??
    params.reference;

  if (!checkoutUrl) {
    throw new Error("AURPay: no checkout URL returned by the API");
  }

  return {
    orderId: String(orderId),
    checkoutUrl,
    status: data?.status ?? data?.data?.status ?? "pending",
    raw: data,
  };
}

/**
 * Verify an AURPay webhook signature.
 * Used by /api/webhooks/aurpay to authenticate incoming payment notifications.
 *
 * AURPay sends:
 *   - X-AURPay-Signature: HMAC-SHA256(apiSecret, timestamp + "." + rawBody)
 *   - X-AURPay-Timestamp: unix seconds
 *
 * Returns true if the signature is valid AND the timestamp is within 5 minutes
 * (prevents replay attacks).
 */
export function verifyAurpayWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
  apiSecret: string
): boolean {
  if (!signature || !timestamp || !apiSecret) return false;

  // Replay protection: reject timestamps older than 5 minutes
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSeconds > 300) return false;

  const expected = signRequest(apiSecret, ts, rawBody);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
