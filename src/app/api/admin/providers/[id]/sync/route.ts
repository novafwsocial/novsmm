import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";

/**
 * POST /api/admin/providers/[id]/sync
 * Triggers a sync of the provider's services.
 *
 * In production, this would:
 * 1. Call the provider's API to fetch their service catalog
 * 2. Compare with our DB services
 * 3. Add new services, update prices, mark unavailable ones
 * 4. Measure API latency
 * 5. Update provider status (healthy/degraded/down)
 *
 * Currently runs in "simulated sync" mode — measures a fake latency
 * and updates the provider record.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const provider = await db.provider.findUnique({
    where: { id: params.id },
    include: { _count: { select: { services: true } } },
  });

  if (!provider) {
    return apiError("Provider not found", 404);
  }

  const startTime = Date.now();

  try {
    // ── Simulated sync ──
    // In production, replace with:
    // const response = await fetch(`${provider.apiUrl}/services`, {
    //   headers: { Authorization: `Bearer ${decrypt(provider.apiKey)}` },
    // });
    // const remoteServices = await response.json();

    // Simulate API call latency (50-300ms)
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 250));

    const latency = Date.now() - startTime;

    // Determine health based on latency
    const status = latency < 150 ? "healthy" : latency < 300 ? "degraded" : "down";

    // Update provider with fresh latency + status
    const updated = await db.provider.update({
      where: { id: params.id },
      data: { latency, status },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "sync_provider",
        entity: "provider",
        entityId: provider.id,
        metadata: JSON.stringify({
          provider: provider.name,
          latency,
          status,
          servicesSynced: provider._count.services,
        }),
      },
    });

    return apiOk({
      provider: updated,
      syncResult: {
        latency,
        status,
        servicesChecked: provider._count.services,
        servicesUpdated: 0, // would be non-zero in real sync
        servicesAdded: 0,
        servicesRemoved: 0,
      },
      message: `Provider synced in ${latency}ms — status: ${status}`,
    });
  } catch (e: any) {
    // Mark provider as down
    await db.provider.update({
      where: { id: params.id },
      data: { status: "down", latency: Date.now() - startTime },
    });

    return apiError(`Sync failed: ${e.message}`, 500);
  }
}
