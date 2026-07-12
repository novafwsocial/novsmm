import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createServiceSchema, updateServiceSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";

/** GET /api/admin/services — paginated list of all services including paused.
 *
 * PERF FIX (P-H-003): previously this route loaded ALL services (6,390+ rows)
 * with includes on every request → 3-5MB JSON response, 500ms+ query time.
 * Now supports server-side pagination + search + platform filter.
 *
 * Query params:
 *   page     — 1-based page number (default 1)
 *   limit    — rows per page (default 50, max 200)
 *   search   — case-insensitive search on name/platform (optional)
 *   platform — filter by platform (optional)
 *
 * Response: { services, pagination: { page, limit, total, totalPages } }
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const search = searchParams.get("search")?.trim() ?? "";
  const platform = searchParams.get("platform")?.trim() ?? "";

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { platform: { contains: search } },
          ],
        }
      : {}),
    ...(platform ? { platform } : {}),
  };

  const [services, total] = await Promise.all([
    db.service.findMany({
      where,
      include: {
        provider: true,
        serviceProviders: { include: { provider: true }, orderBy: { priority: "asc" } },
      },
      orderBy: { platform: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.service.count({ where }),
  ]);

  return apiOk({
    services,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
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
 *
 * SECURITY FIX (S-C-004): the request body is now validated with
 * `updateServiceSchema` (strict Zod). Previously the route spread the raw
 * `body` into Prisma's update() with only a hand-maintained whitelist —
 * fragile and prone to mass assignment if a new column were added.
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }
  const { id, providers, ...data } = parsed.data;

  // Build the normalized providers array (now validated by Zod).
  let normalizedProviders: any[] | null = null;
  if (providers !== undefined) {
    normalizedProviders = providers.map((p) => ({
      providerId: p.providerId,
      priority: p.priority,
      providerServiceId:
        p.providerServiceId !== undefined && p.providerServiceId !== ""
          ? String(p.providerServiceId)
          : null,
      cost: p.cost !== undefined && p.cost !== null ? Number(p.cost) : null,
    }));
  }

  // Wrap the service update + provider-mapping sync in a single tx so they
  // commit atomically.
  const service = await db.$transaction(async (tx) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.minQty !== undefined) updateData.minQty = data.minQty;
    if (data.maxQty !== undefined) updateData.maxQty = data.maxQty;
    if (data.rate !== undefined) updateData.rate = data.rate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.providerId !== undefined) {
      updateData.provider = data.providerId
        ? { connect: { id: data.providerId } }
        : { disconnect: true };
    }

    const updated = await tx.service.update({
      where: { id },
      data: updateData,
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
