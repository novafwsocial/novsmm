import { db } from "@/lib/db";
import { checkHuntSMMOrderStatus } from "@/lib/huntsmm";
import { createNotification } from "@/lib/notify";
import { awardOrderPoints, reconcileAchievements } from "@/lib/services/loyalty.service";

const DEFAULT_RETRY_DELAY_MS = 5 * 60 * 1000;

function mapProviderStatusToOrder(status: string): {
  status: "pending" | "processing" | "in_progress" | "partial" | "completed" | "cancelled";
  progress: number;
  eta: string;
  completedAt?: Date;
} {
  const normalized = status.trim().toLowerCase();
  if (normalized === "completed" || normalized === "complete") {
    return { status: "completed", progress: 100, eta: "—", completedAt: new Date() };
  }
  if (normalized === "partial") return { status: "partial", progress: 60, eta: "Partial" };
  if (normalized === "in progress" || normalized === "in_progress" || normalized === "processing") {
    return { status: "in_progress", progress: 25, eta: "Processing…" };
  }
  if (normalized === "pending" || normalized === "queued") {
    return { status: "pending", progress: 0, eta: "Queued" };
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return { status: "cancelled", progress: 0, eta: "Cancelled" };
  }
  return { status: "processing", progress: 10, eta: "Processing…" };
}

async function handleOrderCompleted(order: {
  id: string;
  publicId: string;
  serviceName: string;
  totalPrice: number;
  userId: string;
}) {
  await createNotification({
    userId: order.userId,
    type: "order",
    title: `Order #${order.publicId} completed ✅`,
    message: `${order.serviceName} — delivery complete.`,
    amount: order.totalPrice,
    severity: "success",
    sendEmail: true,
  });

  try {
    const awarded = await awardOrderPoints(order.userId, order.id, order.totalPrice);
    if (awarded.points > 0) {
      await createNotification({
        userId: order.userId,
        type: "system",
        title: `+${awarded.points} loyalty points earned`,
        message: `Order #${order.publicId} — ${awarded.points} pts awarded (${awarded.multiplier}× loyalty multiplier).`,
        severity: "success",
        sendEmail: false,
      });
    }
    await reconcileAchievements(order.userId);
  } catch (loyaltyErr) {
    console.error("[provider-status-sync] loyalty award/reconcile failed:", loyaltyErr);
  }
}

function extractProviderName(providerName: string | null | undefined): string | null {
  if (!providerName) return null;
  const hashIndex = providerName.lastIndexOf("#");
  return hashIndex > 0 ? providerName.slice(0, hashIndex).trim() : providerName.trim();
}

function extractProviderOrderId(providerName: string | null | undefined): string | null {
  if (!providerName) return null;
  const match = providerName.match(/#\s*([A-Za-z0-9_-]+)\s*$/);
  return match?.[1] ?? null;
}

async function checkSmmPanelOrderStatus(
  apiUrl: string,
  apiKey: string,
  providerOrderId: string,
): Promise<
  { status: string; startCount?: number; remains?: number; charge?: number } | { error: string }
> {
  const endpoint = apiUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key: apiKey,
        action: "status",
        order: providerOrderId,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { error: `Provider returned ${res.status}` };

    const data = await res.json();
    if (data && typeof data === "object" && typeof data.error === "string") {
      return { error: data.error };
    }

    return {
      status: String(data?.status ?? ""),
      startCount: data?.start_count,
      remains: data?.remains,
      charge: data?.charge,
    };
  } catch (e: any) {
    return { error: e?.message ?? "request failed" };
  }
}

/**
 * Poll the upstream provider for the latest status of a provider-backed order.
 *
 * The current implementation focuses on HuntSMM orders because that's the
 * provider wired into the fulfillment path. When the provider reports a
 * terminal state, this helper updates the NOVSMM order and runs the normal
 * completion side effects.
 */
export async function syncProviderOrderStatus(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      publicId: true,
      userId: true,
      status: true,
      providerName: true,
      serviceName: true,
      serviceId: true,
      totalPrice: true,
      progress: true,
      eta: true,
      completedAt: true,
    },
  });

  if (!order || order.status === "completed" || order.status === "cancelled") {
    return { synced: false, reason: "terminal_or_missing" };
  }

  const providerName = extractProviderName(order.providerName);
  const providerOrderId = extractProviderOrderId(order.providerName);
  if (!providerName || !providerOrderId) {
    return { synced: false, reason: "missing_provider_reference" };
  }

  const provider = await db.service.findUnique({
    where: { id: order.serviceId ?? "" },
    select: {
      provider: {
        select: {
          id: true,
          name: true,
          apiUrl: true,
          apiKey: true,
        },
      },
    },
  });

  const providerRecord = provider?.provider ?? null;
  const apiUrl = providerRecord?.apiUrl ?? "";
  const apiKey = providerRecord?.apiKey ?? "";

  if (!providerRecord || !apiUrl) {
    return { synced: false, reason: "unsupported_provider", providerName };
  }

  const statusResult =
    apiUrl.toLowerCase().includes("huntsmm.com")
      ? await checkHuntSMMOrderStatus(providerOrderId)
      : await checkSmmPanelOrderStatus(apiUrl, apiKey, providerOrderId);
  if ("error" in statusResult) {
    console.error(
      `[provider-status-sync] Provider status check failed for ${order.publicId} (${providerRecord.name}):`,
      statusResult.error,
    );
    const { enqueueJob } = await import("./queues");
    await enqueueJob("provider.status.sync", { orderId }, { delay: DEFAULT_RETRY_DELAY_MS });
    return { synced: false, reason: "provider_error", error: statusResult.error };
  }

  const mapped = mapProviderStatusToOrder(statusResult.status);
  await db.order.update({
    where: { id: order.id },
    data: {
      status: mapped.status,
      progress: mapped.progress,
      eta: mapped.eta,
      ...(mapped.completedAt ? { completedAt: mapped.completedAt } : {}),
    },
  });

  if (mapped.status === "completed") {
    await handleOrderCompleted({
      id: order.id,
      publicId: order.publicId,
      serviceName: order.serviceName,
      totalPrice: order.totalPrice,
      userId: order.userId,
    });
    return { synced: true, status: "completed" };
  }

  if (mapped.status === "partial") {
    const { enqueueJob } = await import("./queues");
    await enqueueJob("provider.status.sync", { orderId }, { delay: DEFAULT_RETRY_DELAY_MS });
    return { synced: true, status: "partial", nextPollMs: DEFAULT_RETRY_DELAY_MS };
  }

  if (mapped.status === "pending" || mapped.status === "processing" || mapped.status === "in_progress") {
    const { enqueueJob } = await import("./queues");
    await enqueueJob("provider.status.sync", { orderId }, { delay: DEFAULT_RETRY_DELAY_MS });
    return { synced: true, status: mapped.status, nextPollMs: DEFAULT_RETRY_DELAY_MS };
  }

  return { synced: true, status: mapped.status };
}
