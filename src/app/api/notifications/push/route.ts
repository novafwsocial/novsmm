import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { isVapidConfigured } from "@/lib/web-push";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(8),
  }),
});

/**
 * /api/notifications/push
 *
 *   POST   — register a browser/device push subscription for the caller.
 *            Body: { endpoint, keys: { p256dh, auth } } (the standard
 *            PushSubscription.toJSON() shape from the browser).
 *   DELETE — unsubscribe. Body: { endpoint } or query: ?endpoint=...
 *
 * Auth: session-based. The subscription is tied to the caller's userId
 * so notifications created for them can be delivered to all their
 * devices.
 *
 * Returns the VAPID public key (base64url) in the POST response so the
 * browser can use it for subscribe() — though in sandbox mode (no VAPID
 * keys configured) the field is null and the subscription is still
 * stored (push delivery silently no-ops).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Invalid subscription",
        422,
      );
    }
    const { endpoint, keys } = parsed.data;

    // Upsert by (userId, endpoint) so re-subscribing the same browser
    // doesn't create duplicate rows. P-256 key + auth secret rotate on
    // each subscribe() call, so we always overwrite.
    const sub = await db.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId, endpoint },
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers.get("user-agent") ?? null,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers.get("user-agent") ?? null,
      },
      select: { id: true, createdAt: true },
    });

    return apiOk(
      {
        status: "success",
        subscription: sub,
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
        sandbox: !isVapidConfigured(),
      },
      201,
    );
  } catch (e: any) {
    console.error("[push/subscribe] error:", e);
    return apiError("Failed to register push subscription", 500);
  }
}

/**
 * DELETE — unsubscribe.
 * Accepts the endpoint in the body (preferred) or ?endpoint= query.
 */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  let endpoint: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    endpoint = body?.endpoint;
  } catch {
    // Body parse failed — fall through to query param.
  }
  if (!endpoint) {
    const { searchParams } = new URL(req.url);
    endpoint = searchParams.get("endpoint") ?? undefined;
  }
  if (!endpoint) return apiError("endpoint is required", 422);

  // Only delete subscriptions owned by the caller (the unique constraint
  // is (userId, endpoint), so a single delete is safe).
  try {
    await db.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  } catch (e) {
    console.error("[push/unsubscribe] error:", e);
    return apiError("Failed to unsubscribe", 500);
  }

  return apiOk({ message: "Unsubscribed" });
}

/**
 * GET — returns the caller's subscription count + sandbox status.
 * Useful for the UI to show whether push is enabled on this device.
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const count = await db.pushSubscription.count({ where: { userId } });
  return apiOk({
    count,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
    sandbox: !isVapidConfigured(),
  });
}
