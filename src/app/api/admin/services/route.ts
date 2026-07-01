import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { createServiceSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";

/** GET /api/admin/services — all services including paused. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const services = await db.service.findMany({
    include: { provider: true },
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

    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "create",
        entity: "service",
        entityId: service.id,
        metadata: JSON.stringify({ name: service.name }),
      },
    });

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

/** PATCH /api/admin/services — update a service. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return apiError("Service ID required", 422);

  const service = await db.service.update({
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

  await db.auditLog.create({
    data: {
      userId: adminId,
      action: "update",
      entity: "service",
      entityId: id,
      metadata: JSON.stringify(data),
    },
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

  await db.auditLog.create({
    data: {
      userId: adminId,
      action: "delete",
      entity: "service",
      entityId: id,
    },
  });

  return apiOk({ message: "Service deleted" });
}
