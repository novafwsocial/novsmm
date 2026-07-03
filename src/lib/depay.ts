import crypto from "crypto";

/**
 * DePay payment gateway client.
 *
 * DePay is a decentralized payment processor that lets merchants accept
 * any ERC-20 token (ETH, USDT, USDC, DAI, etc.) directly to their wallet.
 * No KYC, no intermediaries, no custody — payments go directly on-chain.
 *
 * API documentation: https://depay.com/documentation
 *
 * Credentials are read from the PaymentMethod.config column (encrypted at
 * rest with AES-256-GCM via src/lib/crypto-utils.ts).
 *
 * Required credentials (set in Admin → Payments → Configure credentials):
 *   - apiKey        : DePay API key (from dashboard.depay.com)
 *   - integrationId : DePay integration/blockchain id (optional)
 *   - receiverAddress : Wallet address that receives the payments
 *   - webhookSecret  : Secret for verifying DePay webhooks
 */

export interface DepayCredentials {
  apiKey: string;
  integrationId?: string;
  receiverAddress?: string;  // wallet that receives the crypto
  webhookSecret?: string;
}

export interface CreatePaymentParams {
  amount: number;          // USD amount (e.g. 100.00)
  currency: string;        // ISO 4217 (e.g. "USD")
  reference: string;       // merchant order reference (our transaction publicId)
  successUrl: string;      // redirect URL after successful payment
  cancelUrl: string;       // redirect URL after cancelled payment
  customerEmail?: string;  // optional — for receipt
  description?: string;    // optional — shown on the DePay checkout
}

export interface DepayPaymentResult {
  paymentId: string;       // DePay payment id
  checkoutUrl: string;     // hosted checkout URL — browser redirects here
  status: string;          // "pending" | "created"
  raw?: any;               // full response (for debugging)
}

const DEPAY_API_BASE = "https://api.depay.com";

/**
 * Create a DePay payment by POSTing to the DePay API.
 *
 * Flow:
 *   1. Read encrypted credentials from the DB (caller's responsibility).
 *   2. Build the JSON body with amount, currency, reference, redirect URLs,
 *      and the receiver wallet address.
 *   3. Authenticate with the DePay API key in the Authorization header.
 *   4. POST to https://api.depay.com/payments
 *   5. Return the hosted checkout URL the browser should redirect to.
 *
 * The user's balance is NOT credited here — that happens when the DePay
 * webhook fires /api/webhooks/depay with a "payment.completed" event.
 *
 * @throws Error if the DePay API rejects the request or credentials are invalid.
 */
export async function createDepayPayment(
  creds: DepayCredentials,
  params: CreatePaymentParams
): Promise<DepayPaymentResult> {
  if (!creds.apiKey) {
    throw new Error("DePay: missing required credential (apiKey)");
  }

  const endpoint = `${DEPAY_API_BASE}/payments`;

  // ── Build the payment body ──
  // DePay accepts USD amounts and auto-converts to accepted tokens.
  // The receiver is the merchant's wallet address.
  const body = JSON.stringify({
    amount: params.amount.toFixed(2),
    currency: (params.currency || "USD").toUpperCase(),
    reference: params.reference,
    description: params.description ?? `NOVSMM Wallet Top-up — $${params.amount.toFixed(2)}`,
    return_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    receiver: creds.receiverAddress,  // wallet address that receives the crypto
    integration: creds.integrationId, // optional DePay integration id
    // Metadata helps the webhook reconcile the payment back to our transaction
    metadata: {
      source: "novsmm_wallet_topup",
      transaction_public_id: params.reference,
      amount_usd: String(params.amount),
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${creds.apiKey}`,
  };

  // ── POST to DePay ──
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15_000), // 15s timeout — fail fast
    });
  } catch (e: any) {
    throw new Error(`DePay network error: ${e?.message ?? "request failed"}`);
  }

  // ── Parse the response ──
  let data: any;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(`DePay: invalid response (HTTP ${res.status}) ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const errMsg = data?.error?.message ?? data?.message ?? data?.error ?? `HTTP ${res.status}`;
    throw new Error(`DePay API error: ${errMsg}`);
  }

  // ── Extract the checkout URL ──
  // DePay returns either { checkout_url } or { data: { checkout_url } } or { url }
  const checkoutUrl: string | undefined =
    data?.checkout_url ??
    data?.data?.checkout_url ??
    data?.payment_url ??
    data?.data?.payment_url ??
    data?.url ??
    data?.link;

  const paymentId: string | undefined =
    data?.id ??
    data?.payment_id ??
    data?.data?.id ??
    data?.data?.payment_id ??
    params.reference;

  if (!checkoutUrl) {
    throw new Error("DePay: no checkout URL returned by the API");
  }

  return {
    paymentId: String(paymentId),
    checkoutUrl,
    status: data?.status ?? data?.data?.status ?? "pending",
    raw: data,
  };
}

/**
 * Verify a DePay webhook signature.
 * Used by /api/webhooks/depay to authenticate incoming payment notifications.
 *
 * DePay sends webhooks signed with the webhook secret. The signature is
 * computed as HMAC-SHA256(webhookSecret, rawBody).
 *
 * Returns true if the signature is valid.
 */
export function verifyDepayWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
