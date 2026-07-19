import { NextRequest } from "next/server";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { syncProviderOrderStatus } from "@/lib/provider-status-sync";

/** POST /api/admin/orders/[id]/resync
 *
 * Forces a provider status sync for the given order. This is an admin-only
 * operator tool for reconciling orders that got stuck in progress because the
 * upstream provider completed them before NOVSMM observed the final update.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError("Order ID required", 422);

  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, publicId: true, status: true, providerName: true },
  });
  if (!order) return apiError("Order not found", 404);

  const result = await syncProviderOrderStatus(order.id);
  const message = result.synced
    ? `Order #${order.publicId} resync queued`
    : result.reason === "terminal_or_missing"
      ? `Order #${order.publicId} is already completed or unavailable`
      : result.reason === "missing_provider_reference"
        ? `Order #${order.publicId} has no provider reference`
        : result.reason === "unsupported_provider"
          ? `Order #${order.publicId} uses unsupported provider`
          : `Order #${order.publicId} could not be resynced`;

  return apiOk({
    message,
    result,
  });
}
