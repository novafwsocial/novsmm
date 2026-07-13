import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, apiOk, apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { decryptJSON } from "@/lib/crypto-utils";

/**
 * POST /api/admin/payment-methods/test — test payment method credentials.
 * Pings each provider's API to verify saved credentials work.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { method } = body;

  if (!method) return apiError("Method required", 422);

  // Normalize method name
  const methodLower = method.toLowerCase();
  const pm = await db.paymentMethod.findFirst({
    where: { name: { contains: method } },
  });

  let creds: Record<string, any> | null = null;
  if (pm?.config) {
    try { creds = decryptJSON(pm.config); } catch {}
  }

  // Test each provider
  if (methodLower === "paypal" || method === "PayPal") {
    if (!creds?.clientId || !creds?.clientSecret) {
      return apiOk({ ok: false, method, message: "PayPal credentials not configured" });
    }
    try {
      const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
      const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}` },
        body: "grant_type=client_credentials",
      });
      if (res.ok) return apiOk({ ok: true, method, message: "PayPal credentials valid" });
      return apiOk({ ok: false, method, message: "PayPal credentials invalid" });
    } catch {
      return apiOk({ ok: false, method, message: "PayPal API unreachable" });
    }
  }

  if (methodLower === "mercadopago" || method === "Mercado Pago") {
    if (!creds?.accessToken) {
      return apiOk({ ok: false, method, message: "Mercado Pago credentials not configured" });
    }
    try {
      const res = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      if (res.ok) return apiOk({ ok: true, method, message: "Mercado Pago credentials valid" });
      return apiOk({ ok: false, method, message: "Mercado Pago credentials invalid" });
    } catch {
      return apiOk({ ok: false, method, message: "Mercado Pago API unreachable" });
    }
  }

  if (methodLower === "nowpayments" || method === "NowPayments") {
    if (!creds?.apiKey) {
      return apiOk({ ok: false, method, message: "NowPayments credentials not configured" });
    }
    try {
      const res = await fetch("https://api.nowpayments.io/v1/balance", {
        headers: { "x-api-key": creds.apiKey },
      });
      if (res.ok) return apiOk({ ok: true, method, message: "NowPayments credentials valid" });
      return apiOk({ ok: false, method, message: "NowPayments credentials invalid" });
    } catch {
      return apiOk({ ok: false, method, message: "NowPayments API unreachable" });
    }
  }

  if (methodLower === "manual" || method === "Manual") {
    return apiOk({ ok: true, method, message: "Manual method — no credentials needed" });
  }

  return apiOk({ ok: false, method, message: "Test not implemented for this method" });
}
