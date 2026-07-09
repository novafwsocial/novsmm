import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { decryptJSON } from "@/lib/crypto-utils";
import { setStripeCredentials, clearStripeCredentials, getStripe } from "@/lib/stripe";

/**
 * POST /api/admin/payment-methods/test — test that payment-method credentials
 * actually work by issuing a minimal "ping" to each provider's API.
 *
 * Body shape (two modes):
 *   1. Test the credentials currently saved in the DB:
 *      { methodId: "<paymentMethod.id>" }
 *   2. Test credentials the admin just typed into the form (not yet saved):
 *      { method: "stripe" | "paypal" | "mercadopago" | "nowpayments" | "manual",
 *        credentials: { ... } }
 *
 * Response shape:
 *   { ok: boolean, method: string, message: string, details?: any }
 *
 * For methods we haven't implemented the ping for yet, returns HTTP 501 with
 * `{ ok: false, message: "Test not implemented for this method" }`.
 */

type TestResult = {
  ok: boolean;
  method: string;
  message: string;
  details?: any;
};

const SUPPORTED_METHOD_SLUGS = [
  "stripe",
  "paypal",
  "mercadopago",
  "nowpayments",
  "manual",
] as const satisfies readonly string[];
type MethodSlug = (typeof SUPPORTED_METHOD_SLUGS)[number];

/** Map a PaymentMethod.name (as stored in the DB) to the canonical slug. */
function nameToSlug(name: string): MethodSlug | null {
  const n = name.toLowerCase().replace(/\s+/g, "");
  if (n === "stripe") return "stripe";
  if (n === "paypal") return "paypal";
  if (n === "mercadopago") return "mercadopago";
  if (n === "nowpayments") return "nowpayments";
  if (n === "manual") return "manual";
  return null;
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { methodId, method, credentials } = body ?? {};

  // ── Resolve which method + credentials to test ──
  let slug: MethodSlug | null = null;
  let creds: Record<string, any> | null = null;

  if (methodId) {
    // Mode 1: load saved credentials from the DB.
    const pm = await db.paymentMethod.findUnique({ where: { id: methodId } });
    if (!pm) return apiError("Payment method not found", 404);
    slug = nameToSlug(pm.name);
    creds = pm.config ? decryptJSON(pm.config) : null;
  } else if (method) {
    // Mode 2: ad-hoc test of credentials the admin typed but hasn't saved.
    // `method` may arrive as a canonical slug ("stripe") or as the pretty
    // PaymentMethod.name ("Stripe", "Mercado Pago"). Normalize first.
    slug = nameToSlug(String(method));
    creds = credentials ?? null;
  }

  if (!slug) {
    return apiError(
      "Unknown payment method. Pass either { methodId } or { method }.",
      422,
    );
  }

  try {
    const result = await runTest(slug, creds);
    return apiOk(result, result.ok ? 200 : 200);
  } catch (e: any) {
    return apiOk(
      {
        ok: false,
        method: slug,
        message: e?.message ?? "Connection failed",
      } satisfies TestResult,
    );
  }
}

async function runTest(
  slug: MethodSlug,
  creds: Record<string, any> | null,
): Promise<TestResult> {
  switch (slug) {
    case "stripe":
      return testStripe(creds);
    case "paypal":
      return testPaypal(creds);
    case "mercadopago":
      return testMercadoPago(creds);
    case "nowpayments":
      return testNowPayments(creds);
    case "manual":
      return {
        ok: true,
        method: "manual",
        message: "Manual payment needs no credentials — always available.",
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-provider pings — minimal calls that succeed only when creds are valid.
// ─────────────────────────────────────────────────────────────────────────────

async function testStripe(
  creds: Record<string, any> | null,
): Promise<TestResult> {
  const secretKey = creds?.secretKey ?? process.env.STRIPE_SECRET_KEY;
  const webhookSecret =
    creds?.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    return {
      ok: false,
      method: "stripe",
      message: "Missing Stripe secret key (secretKey).",
    };
  }

  // Push the runtime override so getStripe() picks up the DB-stored key.
  setStripeCredentials({ secretKey, webhookSecret });
  try {
    const stripe = getStripe();
    if (!stripe) {
      return {
        ok: false,
        method: "stripe",
        message: "Stripe client could not be initialized.",
      };
    }
    const account = await stripe.accounts.retrieve();
    return {
      ok: true,
      method: "stripe",
      message: "Connected successfully",
      details: {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
        webhookSecretConfigured: !!webhookSecret,
      },
    };
  } catch (e: any) {
    return {
      ok: false,
      method: "stripe",
      message: e?.message ?? "Invalid Stripe credentials",
    };
  } finally {
    // Always clear runtime override — never leak across requests.
    clearStripeCredentials();
  }
}

async function testPaypal(
  creds: Record<string, any> | null,
): Promise<TestResult> {
  const clientId = creds?.clientId;
  const clientSecret = creds?.clientSecret;
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      method: "paypal",
      message: "Missing PayPal clientId / clientSecret.",
    };
  }

  // PayPal "ping": call the token endpoint with the client_credentials
  // grant. A 200 means the creds are valid.
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch(
      "https://api-m.paypal.com/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return {
        ok: false,
        method: "paypal",
        message: `PayPal rejected credentials (HTTP ${tokenRes.status}).`,
        details: txt.slice(0, 200),
      };
    }
    const token = await tokenRes.json();
    return {
      ok: true,
      method: "paypal",
      message: "Connected successfully",
      details: {
        scope: token.scope?.split(" ").length ?? 0,
        app_id: token.app_id,
      },
    };
  } catch (e: any) {
    return {
      ok: false,
      method: "paypal",
      message: e?.message ?? "PayPal connection failed",
    };
  }
}

async function testMercadoPago(
  creds: Record<string, any> | null,
): Promise<TestResult> {
  const accessToken = creds?.accessToken;
  if (!accessToken) {
    return {
      ok: false,
      method: "mercadopago",
      message: "Missing Mercado Pago accessToken.",
    };
  }
  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const txt = await res.text();
      return {
        ok: false,
        method: "mercadopago",
        message:
          res.status === 401
            ? "Invalid or expired access token"
            : `Mercado Pago rejected credentials (HTTP ${res.status}).`,
        details: txt.slice(0, 200),
      };
    }
    const data = await res.json();
    return {
      ok: true,
      method: "mercadopago",
      message: "Connected successfully",
      details: {
        user_id: data.id,
        country: data.site_id,
        email: data.email,
      },
    };
  } catch (e: any) {
    return {
      ok: false,
      method: "mercadopago",
      message: e?.message ?? "Mercado Pago connection failed",
    };
  }
}

async function testNowPayments(
  creds: Record<string, any> | null,
): Promise<TestResult> {
  const apiKey = creds?.apiKey;
  if (!apiKey) {
    return {
      ok: false,
      method: "nowpayments",
      message: "Missing NowPayments apiKey.",
    };
  }
  try {
    // NowPayments exposes /v1/balance — requires only the API key header.
    const res = await fetch("https://api.nowpayments.io/v1/balance", {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const txt = await res.text();
      return {
        ok: false,
        method: "nowpayments",
        message:
          res.status === 401
            ? "Invalid NowPayments API key"
            : `NowPayments rejected credentials (HTTP ${res.status}).`,
        details: txt.slice(0, 200),
      };
    }
    const data = await res.json();
    return {
      ok: true,
      method: "nowpayments",
      message: "Connected successfully",
      details: data,
    };
  } catch (e: any) {
    return {
      ok: false,
      method: "nowpayments",
      message: e?.message ?? "NowPayments connection failed",
    };
  }
}
