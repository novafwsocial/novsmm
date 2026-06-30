import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiOk } from "@/lib/api-utils";

/**
 * GET /api/admin/logs — audit log viewer for admins.
 * Supports ?entity= and ?action= filters.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity");
  const action = searchParams.get("action");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  const logs = await db.auditLog.findMany({
    where: {
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return apiOk({ logs, count: logs.length });
}
