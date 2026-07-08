import { db } from "@/lib/db";
import { createHmac, randomBytes } from "node:crypto";

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
 * awaiting them in the caller's request path. Each fetch has a 5s
 * timeout. Outcomes (status / error) are written back to the
 * OutboundWebhook row so the user can debug failed deliveries.
 */

const DEFAULT_EVENTS = "order.created,order.completed,order.failed";

/** Hard timeout for each delivery (RFC-ish: keep below typical proxy 10s). */
const DELIVERY_TIMEOUT_MS = 5_000;

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
  // 5s timeout. We collect the results so we can update the rows.
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
        const res = await fetch(sub.url, {
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
      } catch (e: any) {
        if (e?.name === "AbortError") {
          errMsg = "Timeout (5s)";
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
