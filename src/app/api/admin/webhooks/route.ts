import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiOk, apiError } from "@/lib/api-utils";

/** GET /api/admin/webhooks — list all webhook logs. */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  const logs = await db.webhookLog.findMany({
    where: {
      ...(provider ? { provider } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return apiOk({ webhooks: logs, count: logs.length });
}
