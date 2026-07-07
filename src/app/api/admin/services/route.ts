import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createServiceSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";

/** GET /api/admin/services — all services including paused. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const services = await db.service.findMany({
    include: {
      provider: true,
      serviceProviders: { include: { provider: true }, orderBy: { priority: "asc" } },
    },
    orderBy: { platform: "asc" },
  });
  return apiOk({ services });
}

/** POST /api/admin/services — create a new service. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { providerId, ...data } = parsed.data;

  try {
    const service = await db.service.create({
      data: {
        ...data,
        ...(providerId
          ? { provider: { connect: { id: providerId } } }
          : {}),
      },
    });

    await audit(adminId, "create", "service", service.id, { name: service.name });

    // Notify all users about the new service
    await createNotification({
      type: "marketplace",
      title: "New service available",
      message: `${service.platform} · ${service.name} — from $${service.price.toFixed(2)} per 1000`,
      severity: "info",
    });

    return apiOk({ service, message: "Service created" }, 201);
  } catch (e: any) {
    if (e.code === "P2002") {
      return apiError("A service with this name already exists", 409);
    }
    throw e;
  }
}

/** PATCH /api/admin/services — update a service.
 *
 * Accepts an optional `providers` array of
 *   `{ providerId, priority, providerServiceId?, cost? }`
 * to replace the service's multi-provider ServiceProvider mappings:
 *   - mappings whose (serviceId, providerId) pair is not in the array are deleted
 *   - mappings present in the array are upserted (priority / providerServiceId /
 *     cost updated if changed)
 *
 * The legacy `providerId` (single-provider field on Service) is still updated
 * when supplied — it remains for backward compatibility with code that hasn't
 * migrated to multi-provider yet.
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, providers, ...data } = body;
  if (!id) return apiError("Service ID required", 422);

  // Validate providers array (optional). Each entry must have a providerId +
  // numeric priority 1-5. providerServiceId and cost are optional.
  let normalizedProviders: any[] | null = null;
  if (providers !== undefined) {
    if (!Array.isArray(providers)) {
      return apiError("`providers` must be an array", 422);
    }
    normalizedProviders = [];
    for (const p of providers) {
      if (!p || typeof p.providerId !== "string") {
        return apiError("Each provider mapping requires a providerId", 422);
      }
      const priority = Number(p.priority ?? 1);
      if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
        return apiError("Priority must be an integer 1-5", 422);
      }
      normalizedProviders.push({
        providerId: p.providerId,
        priority,
        providerServiceId:
          p.providerServiceId !== undefined && p.providerServiceId !== ""
            ? String(p.providerServiceId)
            : null,
        cost:
          p.cost !== undefined && p.cost !== null && p.cost !== ""
            ? Number(p.cost)
            : null,
      });
    }
  }

  // Wrap the service update + provider-mapping sync in a single tx so they
  // commit atomically.
  const service = await db.$transaction(async (tx) => {
    const updated = await tx.service.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.platform ? { platform: data.platform } : {}),
        ...(data.cost !== undefined ? { cost: data.cost } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.minQty !== undefined ? { minQty: data.minQty } : {}),
        ...(data.maxQty !== undefined ? { maxQty: data.maxQty } : {}),
        ...(data.providerId ? { provider: { connect: { id: data.providerId } } } : {}),
      },
    });

    if (normalizedProviders) {
      // ── Replace ServiceProvider mappings ──
      // 1. Delete mappings whose (serviceId, providerId) pair is not in the
      //    submitted array.
      const submittedIds = normalizedProviders.map((p) => p.providerId);
      await tx.serviceProvider.deleteMany({
        where: {
          serviceId: id,
          ...(submittedIds.length > 0
            ? { providerId: { notIn: submittedIds } }
            : {}),
        },
      });

      // 2. Upsert each submitted mapping. (@@unique([serviceId, providerId])
      //    means we can upsert on the composite.)
      for (const p of normalizedProviders) {
        await tx.serviceProvider.upsert({
          where: {
            serviceId_providerId: { serviceId: id, providerId: p.providerId },
          },
          update: {
            priority: p.priority,
            providerServiceId: p.providerServiceId,
            cost: p.cost,
          },
          create: {
            serviceId: id,
            providerId: p.providerId,
            priority: p.priority,
            providerServiceId: p.providerServiceId,
            cost: p.cost,
          },
        });
      }
    }

    return tx.service.findUnique({
      where: { id },
      include: {
        provider: true,
        serviceProviders: {
          include: { provider: true },
          orderBy: { priority: "asc" },
        },
      },
    });
  });

  await audit(adminId, "update", "service", id, {
    ...data,
    ...(normalizedProviders ? { providers: normalizedProviders } : {}),
  });

  return apiOk({ service });
}

/** DELETE /api/admin/services — soft-delete (set status to deleted). */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("Service ID required", 422);

  await db.service.update({
    where: { id },
    data: { status: "deleted" },
  });

  await audit(adminId, "delete", "service", id);

  return apiOk({ message: "Service deleted" });
}
