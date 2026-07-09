import { db } from "@/lib/db";

/**
 * HuntSMM provider integration.
 * Sends real orders to the HuntSMM API and fetches their status.
 */

const HUNTSMM_API_URL = "https://huntsmm.com/api/v2";

function getProviderApiKey(): string | null {
  // Read from environment variable — never hardcode secrets in source
  return process.env.HUNTSMM_API_KEY ?? null;
}

/**
 * Place an order on HuntSMM.
 * Returns the provider's order ID.
 */
export async function placeHuntSMMOrder(
  serviceId: number, // HuntSMM service ID (extracted from our service name [XXXX])
  link: string,
  quantity: number
): Promise<{ orderId: string; status: string } | { error: string }> {
  const key = getProviderApiKey();
  if (!key) return { error: "Provider API key not configured" };

  try {
    const res = await fetch(HUNTSMM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key,
        action: "add",
        service: String(serviceId),
        link,
        quantity: String(quantity),
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return { error: `Provider returned ${res.status}` };

    const data = await res.json();

    if (data.error) return { error: data.error };

    return {
      orderId: String(data.order),
      status: data.status || "Processing",
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

/**
 * Check the status of an order on HuntSMM.
 */
export async function checkHuntSMMOrderStatus(
  providerOrderId: string
): Promise<{
  status: string;
  startCount?: number;
  remains?: number;
  charge?: number;
} | { error: string }> {
  const key = getProviderApiKey();
  if (!key) return { error: "Provider API key not configured" };

  try {
    const res = await fetch(HUNTSMM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key,
        action: "status",
        order: providerOrderId,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { error: `Provider returned ${res.status}` };

    const data = await res.json();

    if (data.error) return { error: data.error };

    return {
      status: data.status,
      startCount: data.start_count,
      remains: data.remains,
      charge: data.charge,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

/**
 * Check the balance on HuntSMM.
 */
export async function checkHuntSMMBalance(): Promise<{
  balance: string;
  currency: string;
} | { error: string }> {
  const key = getProviderApiKey();
  if (!key) return { error: "Provider API key not configured" };

  try {
    const res = await fetch(HUNTSMM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key,
        action: "balance",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { error: `Provider returned ${res.status}` };

    const data = await res.json();

    if (data.error) return { error: data.error };

    return {
      balance: data.balance,
      currency: data.currency,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

/**
 * Extract the HuntSMM service ID from our service name.
 * Our service names are formatted as: [12345] Service Name
 */
export function extractProviderServiceId(serviceName: string): number | null {
  const match = serviceName.match(/^\[(\d+)\]/);
  if (match) return parseInt(match[1]);
  return null;
}

/**
 * ADMIN-FIX-BATCH-2: Fetch the full service catalog from HuntSMM.
 *
 * Used by the admin "Sync now" action (`POST /api/admin/providers/[id]/sync`)
 * to refresh the Service table against the upstream provider's catalog. The
 * returned objects are the raw HuntSMM service rows:
 *   { service, name, category, description, rate, min, max, refill, ... }
 *
 * Throws on HTTP / network / parse errors so the caller can mark the provider
 * as `degraded` and surface the message in the audit log.
 *
 * @param apiKey   HuntSMM API key (from Provider.apiKey).
 * @param apiUrl   Optional override — defaults to the canonical HuntSMM URL.
 */
export async function getHuntSmmServices(
  apiKey: string,
  apiUrl: string = HUNTSMM_API_URL
): Promise<any[]> {
  if (!apiKey) {
    throw new Error("Provider API key not configured");
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key: apiKey, action: "services" }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`HuntSMM API returned ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // HuntSMM returns `{ error: "..." }` on auth/permission failures.
  if (data && typeof data === "object" && typeof data.error === "string") {
    throw new Error(`HuntSMM API error: ${data.error}`);
  }

  if (!Array.isArray(data)) {
    throw new Error("HuntSMM API returned an unexpected (non-array) payload");
  }

  return data;
}
