import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";
import { z } from "zod";

/**
 * POST /api/v1/orders
 * Public API for resellers — creates a new order (or multiple orders).
 * Auth: Bearer nvsk_live_xxx (requires 'order' permission)
 *
 * Supports the PerfectPanel / JAP API contract:
 *   - Single order: { service, link, quantity }
 *   - Multi-order:  { orders: [{ service, link, quantity }, ...] }
 *   - Drip-feed:    { service, link, quantity, runs, interval }
 *   - Custom comments: { service, link, quantity, comments }
 *
 * The response always returns the PerfectPanel-compatible shape:
 *   { status, order, ... } for single order
 *   { status, orders: [...] } for multi-order
 */
const singleOrderSchema = z.object({
  // PerfectPanel uses "service" — accept both "service" and "serviceId"
  service: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  // SECURITY FIX (S-M-003): `link` must be a valid URL with http/https
  // protocol. Previously this was `z.string().min(1)` which accepted
  // ANY string — including `javascript:alert(1)` and `data:text/html,...`.
  // When an admin views the order in the dashboard and clicks the link
  // (rendered as <a href={order.link} target="_blank">), a javascript:
  // URL would execute in the admin's browser → stored XSS.
  // The URL regex allows http/https only (rejects javascript:, data:,
  // blob:, file:, etc.).
  link: z
    .string()
    .url()
    .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
      message: "Link must be an http:// or https:// URL",
    })
    .optional()
    .or(z.literal("")),
  quantity: z.number().int().positive(),
  // Drip-feed params (PerfectPanel contract)
  runs: z.number().int().positive().optional(),
  interval: z.string().optional(), // e.g. "10m", "1h", "30s"
  // Custom comments / mentions (some services accept these)
  comments: z.string().optional(),
  mentions: z.string().optional(),
  // Usernames for subscription-like services (auto-likes on new posts)
  username: z.string().optional(),
  min: z.number().int().positive().optional(),
  max: z.number().int().positive().optional(),
  posts: z.number().int().positive().optional(),
  delay: z.number().int().positive().optional(),
  expiry: z.string().optional(),
});

const multiOrderSchema = z.object({
  orders: z.array(singleOrderSchema).min(1).max(100),
});

/**
 * Parse an interval string like "10m", "1h", "30s" into milliseconds.
 * Defaults to 0 if unparseable.
 */
function parseInterval(interval?: string): number {
  if (!interval) return 0;
  const match = interval.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  switch (unit) {
    case "s": return n * 1000;
    case "m": return n * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    case "d": return n * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

/**
 * Create a single order atomically. Used by both single-order and multi-order flows.
 * Returns { success, order, error } where error is a string on failure.
 */
async function createSingleOrder(
  userId: string,
  rawOrder: z.infer<typeof singleOrderSchema>
): Promise<{ success: true; order: any } | { success: false; error: string }> {
  const serviceId = rawOrder.serviceId || rawOrder.service;
  if (!serviceId) {
    return { success: false, error: "service is required" };
  }

  const link = rawOrder.link || "";
  const quantity = rawOrder.quantity;
  const runs = rawOrder.runs || 1;
  const intervalMs = parseInterval(rawOrder.interval);

  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: { provider: true },
  });
  if (!service || service.status !== "active") {
    return { success: false, error: `Service ${serviceId} not available` };
  }

  // For drip-feed, total quantity = quantity × runs. Validate against maxQty.
  const totalQuantity = quantity * runs;
  if (quantity < service.minQty) {
    return { success: false, error: `Quantity must be >= ${service.minQty}` };
  }
  if (totalQuantity > service.maxQty) {
    return { success: false, error: `Total quantity (${totalQuantity}) must be <= ${service.maxQty}` };
  }

  const totalPrice = (service.price * totalQuantity) / 1000;
  const totalCost = (service.cost * totalQuantity) / 1000;

  // Build drip-feed config if runs > 1 or interval specified
  let dripFeedConfig: any = null;
  if (runs > 1 || intervalMs > 0) {
    dripFeedConfig = {
      totalQuantity,
      chunks: runs,
      perChunk: quantity,
      delayMinutes: Math.round(intervalMs / (60 * 1000)),
      startDate: new Date().toISOString(),
    };
  }

  const publicId = await nextPublicId("A", 10432);
  const txPublicId = await nextPublicId("TX", 8842);

  let order: any;
  try {
    order = await db.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: userId, balance: { gte: totalPrice } },
        data: { balance: { decrement: totalPrice } },
      });
      if (updated.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const created = await tx.order.create({
        data: {
          publicId,
          userId,
          serviceId: service.id,
          serviceName: service.name,
          platform: service.platform,
          quantity: totalQuantity,
          unitCost: service.cost,
          unitPrice: service.price,
          totalCost,
          totalPrice,
          profit: totalPrice - totalCost,
          status: "processing",
          progress: 5,
          providerId: service.providerId,
          providerName: service.provider?.name,
          link: link || null,
          eta: runs > 1 ? `${runs} runs × ${quantity}` : "2m",
          flag: "🌍",
          dripFeedConfig: dripFeedConfig ?? undefined,
        },
      });

      await tx.transaction.create({
        data: {
          publicId: txPublicId,
          userId,
          type: "sale",
          amount: -totalPrice,
          description: `API Order #${publicId} — ${service.name}${runs > 1 ? ` (drip: ${runs}×${quantity})` : ""}`,
          method: "balance",
          reference: publicId,
        },
      });

      return created;
    });
  } catch (e: any) {
    if (e.message === "INSUFFICIENT_BALANCE") {
      const fresh = await db.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      const currentBalance = fresh?.balance ?? 0;
      return {
        success: false,
        error: `Insufficient balance. Need $${totalPrice.toFixed(2)}, have $${currentBalance.toFixed(2)}`,
      };
    }
    throw e;
  }

  await createNotification({
    userId,
    type: "order",
    title: `Order #${publicId} placed (via API)`,
    message: `${service.platform} · ${service.name} — ${totalQuantity.toLocaleString()} units. Total: $${totalPrice.toFixed(2)}`,
    amount: -totalPrice,
    severity: "info",
  });

  enqueueJob("order.fulfill", { orderId: order.id, userId }).catch(() => {});

  return { success: true, order };
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiKey(req, "order");
  if (error) return error;
  const userId = user.id;

  try {
    const body = await req.json();

    // Multi-order mode: { orders: [...] }
    if (body.orders && Array.isArray(body.orders)) {
      const parsed = multiOrderSchema.safeParse(body);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
      }

      const results: any[] = [];
      const errors: any[] = [];
      for (let i = 0; i < parsed.data.orders.length; i++) {
        const orderInput = parsed.data.orders[i];
        const result = await createSingleOrder(userId, orderInput);
        if (result.success) {
          results.push({
            order: result.order.publicId,
            status: result.order.status,
          });
        } else {
          results.push({
            order: null,
            error: result.error,
          });
          errors.push({ index: i, error: result.error });
        }
      }

      return apiOk({
        status: errors.length === 0 ? "success" : "partial",
        orders: results,
        count: results.length,
        errors: errors.length > 0 ? errors : undefined,
      }, 201);
    }

    // Single-order mode
    const parsed = singleOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const result = await createSingleOrder(userId, parsed.data);
    if (!result.success) {
      const status = result.error.includes("Insufficient balance") ? 402 : 422;
      return apiError(result.error, status);
    }

    const order = result.order;
    const service = await db.service.findUnique({
      where: { id: order.serviceId },
      select: { name: true },
    });

    return apiOk({
      status: "success",
      order: order.publicId,
      service: service?.name ?? "",
      quantity: order.quantity,
      price: order.totalPrice,
      orderStatus: order.status,
      message: "Order placed successfully",
    }, 201);
  } catch (e: any) {
    console.error("[v1/orders] error:", e);
    return apiError("Failed to create order", 500);
  }
}
