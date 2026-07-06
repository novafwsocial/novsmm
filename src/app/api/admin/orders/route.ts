import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";
import { z } from "zod";

const manualOrderSchema = z.object({
  userId: z.string().min(1),
  serviceId: z.string().min(1),
  quantity: z.number().int().positive(),
  link: z.string().optional(),
  // Optional: override the price (admin can give discounts)
  customPrice: z.number().positive().optional(),
  // Optional: debit the user's balance for this order. Defaults to false
  // (admin-created orders are complimentary / invoiced separately, which
  // preserves the original behavior). When true, the order is placed inside
  // a $transaction with a race-safe conditional balance debit (same pattern
  // as /api/orders) — so if the user lacks sufficient balance, the whole
  // create is aborted and a 402 is returned.
  debitBalance: z.boolean().optional(),
});

/**
 * POST /api/admin/orders — admin creates an order manually for a user.
 *
 * By default the order is complimentary (no balance debit) — this preserves
 * the original behavior. Pass `debitBalance: true` in the request body to
 * charge the user's balance for the order; in that mode the balance check
 * happens INSIDE the $transaction via a conditional `updateMany`
 * (WHERE balance >= totalPrice) so it's race-safe under PostgreSQL MVCC.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = manualOrderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { userId, serviceId, quantity, link, customPrice, debitBalance } = parsed.data;
  const shouldDebit = debitBalance === true;

  // Validate user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, status: true },
  });
  if (!user) return apiError("User not found", 404);
  if (user.status !== "active") return apiError("User is not active", 422);

  // Validate service
  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: { provider: true },
  });
  if (!service) return apiError("Service not found", 404);

  if (quantity < service.minQty || quantity > service.maxQty) {
    return apiError(`Quantity must be ${service.minQty}-${service.maxQty}`, 422);
  }

  // Calculate price (use custom price if provided, otherwise standard)
  const unitPrice = customPrice ?? service.price;
  const unitCost = service.cost;
  const totalPrice = (unitPrice * quantity) / 1000;
  const totalCost = (unitCost * quantity) / 1000;

  // Pre-compute the order publicId OUTSIDE the transaction — nextPublicId()
  // runs its own atomic Prisma transaction internally, and nesting it inside
  // another $transaction would deadlock / error on some drivers.
  const publicId = await nextPublicId("A", 10432);

  // Order creation.
  //
  // Two modes:
  //  - shouldDebit === false (default): complimentary admin order, no debit.
  //    Preserves the original behavior — single db.order.create call.
  //  - shouldDebit === true: charge the user's balance. Race-safe atomic
  //    purchase — the balance check happens INSIDE the $transaction via a
  //    conditional `updateMany` (WHERE balance >= totalPrice). If the
  //    conditional update affects 0 rows, the user's balance was
  //    insufficient at debit time and we throw `INSUFFICIENT_BALANCE` to
  //    abort the whole transaction. On PostgreSQL (MVCC) this prevents two
  //    concurrent admin orders (or an admin order + a user order) from both
  //    passing the check and both debiting.
  let order: any;
  if (shouldDebit) {
    // Pre-compute the ledger publicId here too (also OUTSIDE the tx).
    const txPublicId = await nextPublicId("TX", 8842);
    try {
      order = await db.$transaction(async (tx) => {
        // Conditional update — only succeeds if balance is sufficient.
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
            quantity,
            unitCost,
            unitPrice,
            totalCost,
            totalPrice,
            profit: totalPrice - totalCost,
            status: "processing",
            progress: 5,
            providerId: service.providerId,
            providerName: service.provider?.name,
            link: link || null,
            eta: "2m",
            flag: "🌍",
          },
        });

        await tx.transaction.create({
          data: {
            publicId: txPublicId,
            userId,
            type: "sale",
            amount: -totalPrice,
            description: `Admin order #${publicId} — ${service.name}`,
            method: "balance",
            reference: publicId,
          },
        });

        return created;
      });
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_BALANCE") {
        // Re-read the current balance for an accurate error message.
        const fresh = await db.user.findUnique({
          where: { id: userId },
          select: { balance: true },
        });
        const currentBalance = fresh?.balance ?? 0;
        return apiError(
          `Insufficient balance. Need $${totalPrice.toFixed(2)}, have $${currentBalance.toFixed(2)}`,
          402,
        );
      }
      throw e;
    }
  } else {
    // Complimentary admin order — no balance debit, no ledger entry.
    order = await db.order.create({
      data: {
        publicId,
        userId,
        serviceId: service.id,
        serviceName: service.name,
        platform: service.platform,
        quantity,
        unitCost,
        unitPrice,
        totalCost,
        totalPrice,
        profit: totalPrice - totalCost,
        status: "processing",
        progress: 5,
        providerId: service.providerId,
        providerName: service.provider?.name,
        link: link || null,
        eta: "2m",
        flag: "🌍",
      },
    });
  }

  // Notification to user
  await createNotification({
    userId,
    type: "order",
    title: `Order #${publicId} created by admin`,
    message: `${service.platform} · ${service.name} — ${quantity.toLocaleString()} units. ${shouldDebit ? "Balance debited." : customPrice ? "Custom price applied." : "Complimentary order."}`,
    amount: -totalPrice,
    severity: "info",
    sendEmail: true,
  });

  // Audit log
  await audit(adminId, "create", "order", order.id, {
    publicId,
    forUser: user.email,
    service: service.name,
    quantity,
    customPrice: customPrice ?? null,
    debitBalance: shouldDebit,
    total: totalPrice,
  });

  // Enqueue fulfillment as a background job (worker via BullMQ, or
  // in-process setImmediate fallback when Redis is not available).
  enqueueJob("order.fulfill", { orderId: order.id, userId }).catch(() => {});

  return apiOk({ order, message: "Order created manually" }, 201);
}
