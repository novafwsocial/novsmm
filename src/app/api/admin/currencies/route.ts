import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";

/** GET /api/admin/currencies — list all currencies. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const currencies = await db.currency.findMany({ orderBy: { sortOrder: "asc" } });
  return apiOk({ currencies });
}

/** POST /api/admin/currencies — add a currency. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  if (!body.code || !body.name || !body.symbol) {
    return apiError("Code, name and symbol are required", 422);
  }

  try {
    const currency = await db.currency.create({
      data: {
        code: body.code.toUpperCase(),
        name: body.name,
        symbol: body.symbol,
        rate: body.rate ?? 1.0,
        status: body.status ?? "active",
        sortOrder: body.sortOrder ?? 99,
      },
    });
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "create",
        entity: "currency",
        entityId: currency.id,
        metadata: JSON.stringify({ code: currency.code }),
      },
    });
    return apiOk({ currency, message: "Currency added" }, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Currency code already exists", 409);
    return apiError("Failed to add currency", 500);
  }
}

/** PATCH /api/admin/currencies — update a currency. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return apiError("ID required", 422);

  const currency = await db.currency.update({ where: { id }, data });
  await db.auditLog.create({
    data: { userId: adminId, action: "update", entity: "currency", entityId: id, metadata: JSON.stringify(data) },
  });
  return apiOk({ currency });
}
