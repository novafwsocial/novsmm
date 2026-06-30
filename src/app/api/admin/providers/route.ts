import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { createProviderSchema } from "@/lib/validations";

/** GET /api/admin/providers */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const providers = await db.provider.findMany({
    include: { _count: { select: { services: true } } },
    orderBy: { name: "asc" },
  });
  return apiOk({ providers });
}

/** POST /api/admin/providers */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = createProviderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid input", 422);
  }

  try {
    const provider = await db.provider.create({ data: parsed.data });
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "create",
        entity: "provider",
        entityId: provider.id,
      },
    });
    return apiOk({ provider, message: "Provider added" }, 201);
  } catch (e: any) {
    if (e.code === "P2002")
      return apiError("Provider name already exists", 409);
    throw e;
  }
}

/** PATCH /api/admin/providers */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return apiError("Provider ID required", 422);

  const provider = await db.provider.update({ where: { id }, data });
  await db.auditLog.create({
    data: { userId: adminId, action: "update", entity: "provider", entityId: id },
  });
  return apiOk({ provider });
}
