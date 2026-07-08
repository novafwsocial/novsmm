import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { generateWebhookSecret, DEFAULT_EVENTS } from "@/lib/outbound-webhook";
import { z } from "zod";

/**
 * /api/admin/webhooks/outbound
 *
 * User-scoped CRUD for outbound webhook subscriptions. (Despite the
 * `/admin/` prefix, the resource is owned by individual users —
 * admins get a full-list view via ?all=1.)
 *
 *   GET    — list the caller's subscriptions (admin: ?all=1 lists everyone's)
 *   POST   — create a new subscription (returns the signing secret once)
 *   DELETE — delete a subscription (by ?id=) owned by the caller
 *
 * Auth: session-based (requireAuth). Admins can list/delete across
 * users via the ?all=1 / ?userId= query params.
 */

const createSchema = z.object({
  url: z.string().url(),
  events: z.string().optional(),
});

/** GET — list subscriptions. */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const isAdmin = (session!.user as any).role === "admin";

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  const filterUserId = searchParams.get("userId");

  // Only admins can list other users' subscriptions.
  const scopeUserId =
    isAdmin && (all || filterUserId)
      ? filterUserId ?? undefined
      : userId;

  const webhooks = await db.outboundWebhook.findMany({
    where: scopeUserId ? { userId: scopeUserId } : { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      lastStatus: true,
      lastError: true,
      lastFiredAt: true,
      createdAt: true,
      updatedAt: true,
      // Deliberately omit `secret` — it's only returned once on creation.
      userId: isAdmin,
    },
  });

  return apiOk({ webhooks, count: webhooks.length });
}

/** POST — create a new outbound webhook subscription. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const url = parsed.data.url;
    const events = (parsed.data.events ?? DEFAULT_EVENTS)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");

    if (!events) {
      return apiError("At least one event must be specified", 422);
    }

    // Basic SSRF guard: reject localhost / private IP ranges. (This is
    // a defence-in-depth check — production should also egress-filter
    // at the network layer.)
    if (isPrivateOrLoopback(url)) {
      return apiError(
        "Webhook URL must be a publicly reachable address (localhost/private IPs not allowed).",
        422,
      );
    }

    const secret = generateWebhookSecret();

    const webhook = await db.outboundWebhook.create({
      data: {
        userId,
        url,
        events,
        secret,
        isActive: true,
      },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Return the secret ONLY on creation — the user must store it.
    // Future GET responses strip the secret field.
    return apiOk(
      {
        webhook,
        secret,
        message:
          "Save this signing secret now — we won't show it again. Verify incoming deliveries with X-NOVSMM-Signature = hex(HMAC-SHA256(secret, raw_body)).",
      },
      201,
    );
  } catch (e: any) {
    console.error("[outbound-webhooks/create] error:", e);
    return apiError("Failed to create webhook", 500);
  }
}

/** DELETE — remove a webhook subscription. */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const isAdmin = (session!.user as any).role === "admin";

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("id is required", 422);

  const existing = await db.outboundWebhook.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!existing) return apiError("Webhook not found", 404);

  if (existing.userId !== userId && !isAdmin) {
    return apiError("Webhook not found", 404);
  }

  await db.outboundWebhook.delete({ where: { id } });

  return apiOk({ message: "Webhook deleted" });
}

/**
 * Returns true if the URL points at localhost or a private/loopback
 * IP range. Used as an SSRF defence.
 */
function isPrivateOrLoopback(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return true;
    }
    // Block common private IP ranges (10.x, 172.16-31.x, 192.168.x).
    if (
      /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      /^[0-9a-f:]+$/i.test(host)
    ) {
      const parts = host.split(".").map(Number);
      if (
        parts.length === 4 &&
        (parts[0] === 10 ||
          (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168) ||
          parts[0] === 127)
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return true; // Invalid URL — treat as blocked.
  }
}
