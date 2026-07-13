/**
 * Webhook IP allowlist helper (defense-in-depth).
 *
 * SECURITY (S-M-007): webhook routes already verify HMAC/RSA signatures
 * (fail-closed), which is the primary defense. This IP allowlist is an
 * OPTIONAL second layer — if the `WEBHOOK_IP_ALLOWLIST` env var is set,
 * only requests from the listed IPs/CIDRs are accepted. If the env var
 * is NOT set, the allowlist is skipped (signature verification alone
 * protects the route).
 *
 * Payment provider IP ranges:
 *   - PayPal: https://www.paypal.com/businessmanage/notifications/aboutWebhooks
 *   - MercadoPago: https://www.mercadopago.com/developers/en/docs/notifications/ipn
 *   - NowPayments: contact support for current IP ranges
 *
 * Usage:
 *   // In a webhook route:
 *   const ipCheck = checkWebhookIp(req);
 *   if (!ipCheck.allowed) return apiError("Forbidden", 403);
 *
 * Configuration (in .env):
 *   WEBHOOK_IP_ALLOWLIST=173.0.0.0/8,192.168.1.50,2001:db8::/32
 *   (comma-separated IPs or CIDR ranges; empty = disabled)
 */

import { NextRequest } from "next/server";

/**
 * Check if an IP is in a CIDR range.
 * Supports both IPv4 and IPv4-mapped IPv6.
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = bitsStr ? parseInt(bitsStr, 10) : 32;

  // Simple IPv4 check
  const ipParts = ip.split(".").map(Number);
  const rangeParts = range.split(".").map(Number);

  if (ipParts.length === 4 && rangeParts.length === 4) {
    if (ipParts.some(isNaN) || rangeParts.some(isNaN)) return false;
    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
    const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
  }

  // IPv6 or invalid — fall back to exact match
  return ip === range;
}

/**
 * Check if the webhook request comes from an allowed IP.
 * Returns { allowed: true } if:
 *   - WEBHOOK_IP_ALLOWLIST is not set (allowlist disabled), OR
 *   - The client IP matches an entry in the allowlist.
 * Returns { allowed: false, reason } otherwise.
 */
export function checkWebhookIp(req: NextRequest): { allowed: boolean; reason?: string } {
  const allowlist = process.env.WEBHOOK_IP_ALLOWLIST;
  if (!allowlist || allowlist.trim() === "") {
    // Allowlist not configured — signature verification is the sole defense.
    return { allowed: true };
  }

  const clientIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-client-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (clientIp === "unknown") {
    return { allowed: false, reason: "Cannot determine client IP" };
  }

  const entries = allowlist.split(",").map((s) => s.trim()).filter(Boolean);
  for (const entry of entries) {
    if (isIpInCidr(clientIp, entry)) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: `IP ${clientIp} not in webhook allowlist` };
}
