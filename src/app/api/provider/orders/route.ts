import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { triggerOutboundWebhooks } from "@/lib/outbound-webhook";
import { createNotification } from "@/lib/notify";

/**
 * Provider Orders API.
 *
 * Lets a provider (role="provider" or "admin") list and update the
 * status of orders placed on their services. The provider↔service link
 * is `Service.providerId → Provider.id`; a provider can only touch
 * orders whose `service.providerId` belongs to them.
 *
 * Routes:
 *   GET   /api/provider/orders           — list orders for the provider's services
 *   PATCH /api/provider/orders           — update order status / startCount / remains
 *
 * PATCH body: { orderId, status, startCount?, remains? }
 *   - status: one of pending | processing | in_progress | partial | completed | cancelled
 *   - startCount / remains: optional provider-reported counters (stored
 *     on the order's audit-log metadata; the schema doesn't have first-
 *     class columns for these so we persist them as JSON metadata).
 *
 * Triggers the outbound webhook `order.completed` (or `order.failed`
 * for cancelled) so subscribers stay in sync.
 */

const VALID_STATUSES = new Set([
  "pending",
  "processing",
  "in_progress",
  "partial",
  "completed",
  "cancelled",
]);

/** Resolve the caller's provider ids (admins get all providers). */
async function resolveProviderIdsForUser(
  userId: string,
  role: string,
): Promise<string[]> {
  if (role === "admin") {
    const all = await db.provider.findMany({ select: { id: true } });
    return all.map((p) => p.id);
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, email: true, name: true },
  });
  if (!user) return [];
  const matches = await db.provider.findMany({
    where: {
      OR: [
        { name: user.username },
        { name: user.email },
        { name: user.name ?? "" },
        { apiKey: userId },
      ],
    },
    select: { id: true },
  });
  return matches.map((p) => p.id);
}

/** GET /api/provider/orders — list orders for the provider's services. */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const role = (session!.user as any).role as string;

  if (role !== "provider" && role !== "admin") {
    return apiError("Provider access required", 403);
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));

  const providerIds = await resolveProviderIdsForUser(userId, role);
  if (providerIds.length === 0) {
    return apiOk({ orders: [] });
  }

  // Restrict to services owned by this provider.
  const services = await db.service.findMany({
    where: { providerId: { in: providerIds } },
    select: { id: true },
  });
  const serviceIds = services.map((s) => s.id);
  if (serviceIds.length === 0) {
    return apiOk({ orders: [] });
  }

  const orders = await db.order.findMany({
    where: {
      serviceId: { in: serviceIds },
      ...(status && status !== "all" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { publicId: { contains: search } },
              { serviceName: { contains: search } },
              { platform: { contains: search } },
              { link: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      service: { select: { id: true, name: true, platform: true } },
    },
  });

  return apiOk({ orders });
}

/** PATCH /api/provider/orders — update an order's status. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const role = (session!.user as any).role as string;

  if (role !== "provider" && role !== "admin") {
    return apiError("Provider access required", 403);
  }

  const body = await req.json().catch(() => ({}));
  const { orderId, status, startCount, remains } = body as {
    orderId?: string;
    status?: string;
    startCount?: number;
    remains?: number;
  };

  if (!orderId || typeof orderId !== "string") {
    return apiError("orderId is required", 422);
  }
  if (!status || !VALID_STATUSES.has(status)) {
    return apiError(
      `status must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
      422,
    );
  }

  // ── Ownership check: the order must be on a service owned by this provider ──
  const providerIds = await resolveProviderIdsForUser(userId, role);
  if (providerIds.length === 0) {
    return apiError("Order not found", 404);
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      service: { select: { id: true, providerId: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order || !order.service || !providerIds.includes(order.service.providerId ?? "")) {
    return apiError("Order not found", 404);
  }

  // Capture the original status BEFORE we overwrite it (used by the
  // outbound-webhook payload below so subscribers can see the transition).
  const previousStatus = order.status;

  // ── Compute new progress / eta ──
  // Map the new status to a sensible progress + eta label so the UI
  // reflects the change immediately.
  let progress = order.progress;
  let eta = order.eta;
  let completedAt: Date | null = null;
  switch (status) {
    case "pending":
      progress = 0;
      eta = "Queued";
      break;
    case "processing":
      progress = Math.max(progress, 5);
      eta = "Starting";
      break;
    case "in_progress":
      progress = Math.max(progress, 25);
      eta = "In progress";
      break;
    case "partial":
      progress = Math.max(progress, 60);
      eta = "Partial";
      break;
    case "completed":
      progress = 100;
      eta = "Delivered";
      completedAt = new Date();
      break;
    case "cancelled":
      progress = 0;
      eta = "Cancelled";
      break;
  }

  // Capture provider-reported counters in the audit log metadata (the
  // schema doesn't have first-class columns for startCount/remains).
  const metadata: Record<string, unknown> = {
    publicId: order.publicId,
    previousStatus: order.status,
    newStatus: status,
    providerUserId: userId,
  };
  if (typeof startCount === "number") metadata.startCount = startCount;
  if (typeof remains === "number") metadata.remains = remains;

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      status,
      progress,
      eta,
      ...(completedAt ? { completedAt } : {}),
    },
    include: {
      service: { select: { id: true, name: true, platform: true } },
    },
  });

  // ── Audit log ──
  await db.auditLog.create({
    data: {
      userId,
      action: "update",
      entity: "order",
      entityId: orderId,
      metadata: JSON.stringify(metadata),
    },
  });

  // ── Notify the buyer ──
  try {
    const verb =
      status === "completed" ? "completed"
        : status === "cancelled" ? "cancelled"
        : status === "in_progress" ? "is now in progress"
        : `updated to ${status}`;
    await createNotification({
      userId: order.userId,
      type: "order",
      title: `Order #${order.publicId} ${verb}`,
      message: `${order.serviceName} — ${status}.`,
      severity: status === "cancelled" ? "warning" : "info",
      sendEmail: status === "completed" || status === "cancelled",
    });
  } catch (e) {
    console.error("[provider/orders] notify failed:", e);
  }

  // ── Outbound webhooks ──
  // Fire `order.completed` when the provider completes, `order.failed`
  // when cancelled, and `order.status_changed` for ALL other transitions
  // (processing, in_progress, partial, etc.) so subscribers can track
  // every status change without polling.
  try {
    if (status === "completed") {
      triggerOutboundWebhooks(order.userId, "order.completed", {
        id: order.id,
        publicId: order.publicId,
        service: order.serviceName,
        total: order.totalPrice,
        currency: "USD",
        status,
        completedAt: completedAt?.toISOString(),
      });
    } else if (status === "cancelled") {
      triggerOutboundWebhooks(order.userId, "order.failed", {
        id: order.id,
        publicId: order.publicId,
        service: order.serviceName,
        total: order.totalPrice,
        currency: "USD",
        status,
        reason: "cancelled_by_provider",
        failedAt: new Date().toISOString(),
      });
    }

    // Always fire order.status_changed for ANY transition (including completed/cancelled)
    // so subscribers tracking the full lifecycle get every update
    triggerOutboundWebhooks(order.userId, "order.status_changed", {
      id: order.id,
      publicId: order.publicId,
      service: order.serviceName,
      platform: order.platform,
      total: order.totalPrice,
      currency: "USD",
      previousStatus,
      newStatus: status,
      progress,
      ...(typeof startCount === "number" ? { startCount } : {}),
      ...(typeof remains === "number" ? { remains } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[provider/orders] outbound webhook failed:", e);
  }

  return apiOk({ order: updated, message: `Order ${status}` });
}
