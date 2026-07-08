import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { sendPushToUser, sendWebPush } from "@/lib/web-push";
import { z } from "zod";

const sendSchema = z
  .object({
    // Send to a single user (looks up their subscriptions) or to a raw
    // subscription endpoint. Exactly one must be provided.
    userId: z.string().min(1).optional(),
    endpoint: z.string().url().optional(),
    p256dh: z.string().optional(),
    auth: z.string().optional(),
    // Payload to deliver (any JSON-serialisable object).
    title: z.string().min(1).max(200),
    body: z.string().max(500).optional(),
    url: z.string().url().optional(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    tag: z.string().max(64).optional(),
  })
  .refine(
    (d) => Boolean(d.userId) || (Boolean(d.endpoint) && Boolean(d.p256dh) && Boolean(d.auth)),
    {
      message: "Provide either `userId` or a full `endpoint` + `p256dh` + `auth` set.",
    },
  );

/**
 * POST /api/notifications/push/send — admin-only push dispatch.
 *
 * Body shape:
 *   {
 *     userId?: string,            // send to every device owned by this user
 *     endpoint?: string,          // OR send to a raw subscription
 *     p256dh?: string,
 *     auth?: string,
 *     title: string,              // notification title (required)
 *     body?: string,              // notification body
 *     url?: string,               // deep-link URL opened on click
 *     icon?, badge?, tag?: string // standard NotificationOptions
 *   }
 *
 * Returns:
 *   { sent, failed, removed, sandbox }
 *
 * Auth: admin session.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Invalid input",
        422,
      );
    }
    const d = parsed.data;

    // The actual push payload that the service worker renders.
    const payload = {
      title: d.title,
      body: d.body ?? "",
      url: d.url ?? "/",
      icon: d.icon,
      badge: d.badge,
      tag: d.tag ?? "novsmm",
      timestamp: Date.now(),
    };

    // ── Single-user broadcast ──
    if (d.userId) {
      const result = await sendPushToUser(d.userId, payload);
      return apiOk({
        status: "success",
        ...result,
      });
    }

    // ── Raw subscription ──
    const result = await sendWebPush({
      payload,
      subscription: {
        endpoint: d.endpoint!,
        p256dh: d.p256dh!,
        auth: d.auth!,
      },
      topic: d.tag,
    });
    return apiOk({
      status: result.ok ? "success" : "failed",
      ok: result.ok,
      sandbox: result.sandbox,
      error: result.error,
      status_code: result.status,
    });
  } catch (e: any) {
    console.error("[push/send] error:", e);
    return apiError("Failed to send push", 500);
  }
}
