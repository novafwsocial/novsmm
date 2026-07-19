import { db } from "@/lib/db";
import { createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Outbound webhook dispatcher.
 *
 * Users register outbound webhook subscriptions (URL + events + signing
 * secret). When an order event fires (order.created, order.completed,
 * order.failed), `triggerOutboundWebhooks` is invoked with the user id,
 * the event name, and the payload. The function looks up every active
 * subscription for that user that's subscribed to the event and
 * delivers the payload HTTP POST, signed with HMAC-SHA256.
 *
 * Contract (delivered to the receiver):
 *   POST <user-url>
 *   Content-Type: application/json
 *   X-NOVSMM-Signature: <hex(hmac_sha256(secret, body))>
 *   X-NOVSMM-Event: <event-name>
 *   X-NOVSMM-Delivery: <unique-delivery-id>
 *   Body: { event, deliveryId, createdAt, data: <payload> }
 *
 * Delivery is fire-and-forget: the dispatcher runs the fetches without
 * awaiting them in the caller's request path. Each fetch has a 10s
 * timeout. Outcomes (status / error) are written back to the
 * OutboundWebhook row so the user can debug failed deliveries.
 *
 * SECURITY (OWASP A10-1, P0): SSRF protection — `validateUrlSafe()` is
 * invoked BOTH at registration time (admin/webhooks/outbound/route.ts)
 * AND at delivery time (here). The check:
 *   • Allows only http/https protocols
 *   • Resolves DNS at fetch time (defeats DNS rebinding)
 *   • Checks ALL resolved A+AAAA records against a comprehensive
 *     blocklist (loopback, private, CGNAT, link-local incl. AWS metadata,
 *     IPv6 ULA, IPv6 link-local, IPv4-mapped IPv6, 0.0.0.0/8, etc.)
 *   • Uses `redirect: "manual"` and re-validates each Location header
 *     through the same SSRF check (max 5 redirects).
 */

const DEFAULT_EVENTS = "order.created,order.completed,order.failed";

/** Hard timeout for each delivery. */
const DELIVERY_TIMEOUT_MS = 10_000;

/** Max redirects to follow (each one re-validated against the blocklist). */
const MAX_REDIRECTS = 5;

/** Cap on response body size — we don't need the body, so abort if >1MB. */
const MAX_RESPONSE_BYTES = 1_000_000;

/**
 * Generate a new HMAC-SHA256 signing secret. 32 bytes of entropy, hex-encoded.
 * Shown to the user once on creation; we never expose it again.
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate the random opaque token used in invite URLs.
 * Reused by team invites (separate concern but same random pattern).
 */
export function generateOpaqueToken(byteLength: number = 24): string {
  return randomBytes(byteLength).toString("hex");
}

/**
 * Compute the HMAC-SHA256 signature for a body+secret pair.
 * Exposed so receivers (or admin tooling) can re-compute and verify.
 */
export function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
//  SSRF protection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a hostname to ALL of its A/AAAA records.
 * Throws if DNS resolution fails or returns no records.
 */
async function resolveIps(hostname: string): Promise<string[]> {
  try {
    const result = await lookup(hostname, { all: true });
    if (result.length === 0) {
      throw new Error(`No DNS records for ${hostname}`);
    }
    return result.map((r) => r.address);
  } catch (e: any) {
    throw new Error(`DNS resolution failed for ${hostname}: ${e?.message ?? e}`);
  }
}

/**
 * Returns true if the given IP (v4 or v6, including IPv4-mapped IPv6)
 * falls into a private / reserved / loopback / link-local / CGNAT /
 * cloud-metadata range that we never want to fetch.
 */
export function isBlockedIp(ip: string): boolean {
  // Normalize IPv4-mapped IPv6 (::ffff:a.b.c.d) → a.b.c.d
  let normalized = ip.toLowerCase();
  const v4MappedMatch = normalized.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4MappedMatch) {
    normalized = v4MappedMatch[1];
  }
  // Also handle ::a.b.c.d (deprecated IPv4-compatible IPv6)
  const v4CompatMatch = normalized.match(/^::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4CompatMatch) {
    normalized = v4CompatMatch[1];
  }

  // ── IPv4 checks ──
  if (net.isIPv4(normalized)) {
    const parts = normalized.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
      return true; // malformed — treat as blocked
    }
    const [a, b] = parts;

    // 0.0.0.0/8 — "this host" (Linux routes 0.0.0.0 to localhost)
    if (a === 0) return true;
    // 10.0.0.0/8 — private
    if (a === 10) return true;
    // 100.64.0.0/10 — CGNAT
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 — loopback
    if (a === 127) return true;
    // 169.254.0.0/16 — link-local (incl. AWS/Azure/GCP metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 — private
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 — IETF protocol assignments
    if (a === 192 && b === 0) return true;
    // 192.0.2.0/24 — TEST-NET-1 (documentation)
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    // 192.88.99.0/24 — 6to4 anycast (deprecated)
    if (a === 192 && b === 88 && parts[2] === 99) return true;
    // 192.168.0.0/16 — private
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 — benchmark / performance testing
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 — TEST-NET-2
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    // 203.0.113.0/24 — TEST-NET-3
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 — multicast
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 — reserved (incl. 255.255.255.255 broadcast)
    if (a >= 240) return true;

    return false;
  }

  // ── IPv6 checks (after normalization) ──
  if (net.isIPv6(normalized)) {
    // ::1/128 — IPv6 loopback
    if (normalized === "::1") return true;
    // :: — unspecified (equivalent to 0.0.0.0)
    if (normalized === "::") return true;
    // fc00::/7 — Unique Local Address (ULA)
    if (/^f[cd][0-9a-f]{2}:/.test(normalized) || normalized.startsWith("fc") || normalized.startsWith("fd")) {
      // more precise: first byte 0xfc or 0xfd
      const firstByte = parseInt(normalized.split(":")[0].padStart(4, "0").slice(0, 2), 16);
      if (firstByte >= 0xfc && firstByte <= 0xfd) return true;
    }
    // fe80::/10 — link-local
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
      const firstByte = parseInt(normalized.split(":")[0].padStart(4, "0").slice(0, 2), 16);
      if (firstByte === 0xfe) {
        const secondByte = parseInt(normalized.split(":")[0].padStart(4, "0").slice(2, 4), 16);
        if (secondByte >= 0x80 && secondByte <= 0xbf) return true;
      }
    }
    // ff00::/8 — multicast
    if (normalized.startsWith("ff")) return true;
    // 64:ff9b::/96 — NAT64 well-known prefix (RFC 6052)
    if (normalized.startsWith("64:ff9b:")) return true;
    // 100::/64 — discard prefix (RFC 6666)
    if (normalized.startsWith("100::")) return true;
    // 2001:db8::/32 — documentation
    if (normalized.startsWith("2001:db8:")) return true;

    return false;
  }

  // Unknown family — block defensively.
  return true;
}

/**
 * Validate that a URL is safe to fetch (SSRF guard).
 *
 * Resolves DNS at the time of call (defeats DNS rebinding) and checks
 * every resolved IP against a comprehensive blocklist.
 *
 * Throws an Error if the URL is unsafe.
 */
export async function validateUrlSafe(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Protocol not allowed: ${parsed.protocol}`);
  }

  // Reject usernames/passwords in URL — they're a smuggling vector.
  if (parsed.username || parsed.password) {
    throw new Error(`URL credentials not allowed`);
  }

  const hostname = parsed.hostname;

  // Reject raw-IP hostnames that are blocked (don't even bother with DNS).
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error(`SSRF blocked: ${hostname} is in a forbidden range`);
    }
    return;
  }

  // Reject obvious localhost names.
  const lowerHost = hostname.toLowerCase();
  if (lowerHost === "localhost" || lowerHost.endsWith(".localhost")) {
    throw new Error(`SSRF blocked: ${hostname} is a localhost name`);
  }

  // Resolve DNS and check every returned IP.
  const ips = await resolveIps(hostname);
  for (const ip of ips) {
    if (isBlockedIp(ip)) {
      throw new Error(`SSRF blocked: ${hostname} resolves to ${ip}`);
    }
  }
}

/**
 * Safe fetch wrapper that:
 *   • Validates the URL against the SSRF blocklist (DNS resolution at fetch time)
 *   • Follows redirects manually, re-validating each Location header
 *   • Caps response body size to MAX_RESPONSE_BYTES
 *
 * Returns the final Response. The caller is responsible for reading the
 * body (or calling `res.body?.cancel()` to abort the stream after
 * inspecting `res.status`).
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {},
  maxRedirects: number = MAX_REDIRECTS,
): Promise<Response> {
  await validateUrlSafe(url);

  // Always use manual redirects so we can re-validate each hop.
  const response = await fetch(url, {
    ...options,
    redirect: "manual",
  });

  // 3xx — re-validate and follow manually (subject to MAX_REDIRECTS).
  if ([301, 302, 303, 307, 308].includes(response.status) && maxRedirects > 0) {
    const location = response.headers.get("location");
    if (!location) {
      // Cancel the body before throwing
      try { await response.body?.cancel(); } catch {}
      throw new Error("Redirect response missing Location header");
    }
    const redirectUrl = new URL(location, url).toString();

    // Cancel the body of the redirect response — we don't need it.
    try { await response.body?.cancel(); } catch {}

    // Re-validate the redirect URL through the same SSRF check.
    // (recursive call — decrements maxRedirects)
    return safeFetch(redirectUrl, options, maxRedirects - 1);
  }

  // For non-3xx responses, wrap the body so we cap its size at
  // MAX_RESPONSE_BYTES. If the caller doesn't read the body, the
  // underlying stream is still bounded.
  return wrapResponseWithSizeCap(response);
}

/**
 * Wrap a Response so that reading its body aborts once MAX_RESPONSE_BYTES
 * is exceeded. This prevents an attacker-controlled webhook URL from
 * streaming gigabytes of data into our process (OWASP A10-2).
 */
function wrapResponseWithSizeCap(response: Response): Response {
  if (!response.body) return response;

  const reader = response.body.getReader();
  let bytesRead = 0;

  const cappedStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      bytesRead += value.byteLength;
      if (bytesRead > MAX_RESPONSE_BYTES) {
        // Abort — too large.
        try { await reader.cancel(); } catch {}
        controller.error(new Error("Response body exceeded size limit"));
        return;
      }
      controller.enqueue(value);
    },
    cancel() {
      return reader.cancel();
    },
  });

  return new Response(cappedStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger outbound webhooks for a (userId, event, payload) tuple.
 *
 * Non-blocking: the function dispatches the HTTP POSTs in the
 * background (one fetch per matching subscription) and returns
 * immediately. The caller's request path is never blocked by webhook
 * delivery.
 *
 * Failures are non-fatal: the function never throws. Each delivery's
 * outcome is written back to the matching OutboundWebhook row.
 */
export function triggerOutboundWebhooks(
  userId: string,
  event: string,
  payload: unknown,
): void {
  // Fire and forget — we deliberately don't await the inner async.
  void deliverOutboundWebhooks(userId, event, payload).catch((e) => {
    console.error("[outbound-webhook] dispatcher failed:", e);
  });
}

async function deliverOutboundWebhooks(
  userId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  // Look up every active webhook subscription owned by this user that's
  // subscribed to the fired event.
  const subscriptions = await db.outboundWebhook.findMany({
    where: { userId, isActive: true },
    select: { id: true, url: true, events: true, secret: true },
  });

  const matching = subscriptions.filter((s) =>
    s.events
      .split(",")
      .map((e) => e.trim())
      .includes(event),
  );

  if (matching.length === 0) return;

  // Deliver concurrently — one fetch per subscription. Each has its own
  // 10s timeout. We collect the results so we can update the rows.
  const deliveryId = randomBytes(12).toString("hex");
  const body = JSON.stringify({
    event,
    deliveryId,
    createdAt: new Date().toISOString(),
    data: payload,
  });

  await Promise.allSettled(
    matching.map(async (sub) => {
      const signature = signBody(sub.secret, body);
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        DELIVERY_TIMEOUT_MS,
      );
      let status: number | null = null;
      let errMsg: string | null = null;
      try {
        // SECURITY: safeFetch re-resolves DNS at fetch time (defeats DNS
        // rebinding), validates against the SSRF blocklist, follows
        // redirects manually with re-validation, and caps response size.
        const res = await safeFetch(sub.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-NOVSMM-Signature": signature,
            "X-NOVSMM-Event": event,
            "X-NOVSMM-Delivery": deliveryId,
          },
          body,
          signal: controller.signal,
        });
        status = res.status;
        // 2xx = success. Anything else is an error worth surfacing.
        if (!res.ok) {
          errMsg = `HTTP ${res.status} ${res.statusText}`;
        }
        // Cancel the body — we don't need it, and this prevents the
        // server from streaming more data than necessary.
        try { await res.body?.cancel(); } catch {}
      } catch (e: any) {
        if (e?.name === "AbortError") {
          errMsg = "Timeout (10s)";
        } else {
          errMsg = e?.message ?? String(e);
        }
      } finally {
        clearTimeout(timer);
      }

      // Write the outcome back to the subscription row (best-effort).
      try {
        await db.outboundWebhook.update({
          where: { id: sub.id },
          data: {
            lastStatus: String(status ?? 0),
            lastError: errMsg,
            lastFiredAt: new Date(),
          },
        });
      } catch (e) {
        console.error("[outbound-webhook] update failed:", e);
      }
    }),
  );
}

/** Default event list (re-exported for the admin route). */
export { DEFAULT_EVENTS };
