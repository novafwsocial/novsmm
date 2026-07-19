import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createProviderSchema, updateProviderSchema } from "@/lib/validations";

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
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  try {
    const provider = await db.provider.create({ data: parsed.data });
    await audit(adminId, "create", "provider", provider.id);
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
  const parsed = updateProviderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }
  const { id, ...data } = parsed.data;

  const provider = await db.provider.update({ where: { id }, data });
  await audit(adminId, "update", "provider", id);
  return apiOk({ provider });
}
