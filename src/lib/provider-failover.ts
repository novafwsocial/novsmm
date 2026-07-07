import { db } from "@/lib/db";
import { placeHuntSMMOrder } from "@/lib/huntsmm";

/**
 * Provider failover — multi-provider order fulfillment with priority ordering.
 *
 * Each Service can have multiple ServiceProvider mappings, each with a
 * `priority` (1 = primary, 2 = first fallback, 3 = second fallback, etc.).
 * When an order needs to be fulfilled:
 *
 *   1. Query `ServiceProvider` mappings for the service, ordered by priority.
 *   2. For each provider (in priority order):
 *      a. Skip if `provider.status === "down"`.
 *      b. Try to place the order via the provider's API (HuntSMM for now).
 *      c. On success: update the Order with `providerName` + provider order
 *         ID, mark `in_progress`, return the result. Done.
 *      d. On failure: `console.error` + mark provider `degraded` if this is
 *         the 2nd+ consecutive failure, then continue to the next provider.
 *   3. If all providers fail, return `null` (caller falls back to simulation).
 *
 * For backward compatibility, if a service has no ServiceProvider mappings
 * but still has the legacy single `providerId`, the function falls back to
 * the legacy single-provider flow via `placeHuntSMMOrder` using the service
 * name's embedded `[XXXX]` provider service ID.
 *
 * This is the entry point used by `simulateFulfillment()` in `src/lib/orders.ts`.
 */

export interface FailoverOrderInput {
  id: string;
  serviceId: string | null;
  link: string | null;
  quantity: number;
  serviceName: string;
}

export interface FailoverResult {
  providerOrderId: string;
  providerName: string;
}

/**
 * Try to fulfil an order via the service's providers, in priority order.
 * Returns the first successful provider order, or `null` if every provider
 * fails (caller then falls back to the simulated setTimeout steps).
 */
export async function fulfillWithFailover(
  order: FailoverOrderInput,
): Promise<FailoverResult | null> {
  // Don't even try without a link — the HuntSMM API requires one.
  if (!order.link) return null;
  if (!order.serviceId) return null;

  // ── 1. Multi-provider path: ServiceProvider mappings, ordered by priority ──
  const mappings = await db.serviceProvider.findMany({
    where: { serviceId: order.serviceId },
    include: { provider: true },
    orderBy: { priority: "asc" },
  });

  for (const mapping of mappings) {
    const provider = mapping.provider;
    if (provider.status === "down") {
      console.warn(
        `[failover] Skipping ${provider.name} (status=down) for order ${order.id}`,
      );
      continue;
    }

    // The provider service ID at HuntSMM is stored on the mapping (if admin
    // filled it in). Fall back to extracting it from our service name
    // `[XXXX] ...` for backward compat.
    const huntsmmServiceId = mapping.providerServiceId
      ? Number(mapping.providerServiceId)
      : extractLeadingId(order.serviceName);

    if (!huntsmmServiceId) {
      console.error(
        `[failover] No provider service ID for mapping ${mapping.id} (service ${order.serviceName})`,
      );
      continue;
    }

    const result = await placeHuntSMMOrder(
      huntsmmServiceId,
      order.link,
      order.quantity,
    );

    if ("orderId" in result) {
      // ── Success: stamp the order with the provider's order ID and return ──
      await db.order.update({
        where: { id: order.id },
        data: {
          status: "in_progress",
          progress: 10,
          eta: `Processing on ${provider.name}`,
          providerName: `${provider.name} #${result.orderId}`,
        },
      });
      return {
        providerOrderId: result.orderId,
        providerName: `${provider.name} #${result.orderId}`,
      };
    }

    // ── Failure: log + nudge provider to "degraded" on repeat failures ──
    console.error(
      `[failover] Provider ${provider.name} (priority ${mapping.priority}) failed for order ${order.id}: ${result.error}`,
    );

    await markDegradedIfRepeatFailure(provider.id).catch((e) =>
      console.error("[failover] degraded-mark failed:", e),
    );
  }

  // ── 2. Legacy single-provider path (no ServiceProvider mappings) ──
  // If the service still carries the old `providerId` field, try HuntSMM
  // once more using the service-name-extracted ID. This keeps existing
  // services working before admins have time to migrate them to multi-provider.
  if (mappings.length === 0) {
    const legacyId = extractLeadingId(order.serviceName);
    if (legacyId) {
      const result = await placeHuntSMMOrder(
        legacyId,
        order.link,
        order.quantity,
      );
      if ("orderId" in result) {
        await db.order.update({
          where: { id: order.id },
          data: {
            status: "in_progress",
            progress: 10,
            eta: "Processing on HuntSMM",
            providerName: `HuntSMM #${result.orderId}`,
          },
        });
        return {
          providerOrderId: result.orderId,
          providerName: `HuntSMM #${result.orderId}`,
        };
      }
      console.error(
        `[failover] Legacy HuntSMM call failed for order ${order.id}: ${result.error}`,
      );
    }
  }

  // ── 3. All providers exhausted — caller falls back to simulation ──
  return null;
}

/**
 * Extract a leading integer ID from a service name like `[12345] Followers`.
 * Returns `null` if the name has no leading `[N]` segment.
 */
function extractLeadingId(serviceName: string): number | null {
  const match = serviceName.match(/^\[(\d+)\]/);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * Mark a provider as "degraded" if it has failed 2+ times in the last hour.
 *
 * We avoid flipping on the first failure — transient network blips are
 * normal. After 2+ failures in the trailing 60 minutes we lower the
 * provider's status to "degraded" so the dashboard reflects reality and
 * downstream code can prefer healthier providers.
 *
 * Implementation note: we approximate "consecutive failures" by counting
 * recent audit log entries for that provider with action="failover_fail".
 * This avoids adding a dedicated failure counter column. Best-effort: any
 * error reading the log is swallowed (failover must never break on telemetry).
 */
async function markDegradedIfRepeatFailure(providerId: string): Promise<void> {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentFailures = await db.auditLog.count({
      where: {
        entity: "provider",
        entityId: providerId,
        action: "failover_fail",
        createdAt: { gte: since },
      },
    });

    // Record this failure for future counts.
    await db.auditLog.create({
      data: {
        userId: null,
        action: "failover_fail",
        entity: "provider",
        entityId: providerId,
        ip: "unknown",
        userAgent: "failover/worker",
      },
    });

    if (recentFailures >= 1) {
      // 1 prior + this one = 2 failures in the window → degrade.
      await db.provider
        .update({
          where: { id: providerId },
          data: { status: "degraded" },
        })
        .catch(() => {});
    }
  } catch (e) {
    // Telemetry must never break fulfillment.
    console.error("[failover] markDegradedIfRepeatFailure error:", e);
  }
}
