import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { z } from "zod";

const bulkSchema = z.object({
  entity: z.enum(["user", "order", "service"]),
  action: z.enum(["activate", "suspend", "delete", "cancel", "complete", "pause"]),
  ids: z.array(z.string()).min(1).max(100),
});

/**
 * POST /api/admin/bulk — bulk operations on users, orders, or services.
 * Body: { entity: "user"|"order"|"service", action: "activate"|"suspend"|"delete"|"cancel"|"complete"|"pause", ids: ["id1","id2",...] }
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { entity, action, ids } = parsed.data;
  let affected = 0;

  if (entity === "user") {
    if (action === "activate") {
      affected = (await db.user.updateMany({ where: { id: { in: ids } }, data: { status: "active" } })).count;
    } else if (action === "suspend") {
      affected = (await db.user.updateMany({ where: { id: { in: ids } }, data: { status: "suspended" } })).count;
    } else if (action === "delete") {
      affected = (await db.user.updateMany({ where: { id: { in: ids } }, data: { status: "suspended" } })).count;
      // Soft-delete: just suspend, don't actually delete users
    } else {
      return apiError(`Action ${action} not supported for users`, 422);
    }
  } else if (entity === "order") {
    if (action === "cancel") {
      affected = (await db.order.updateMany({ where: { id: { in: ids }, status: { in: ["pending", "processing", "in_progress"] } }, data: { status: "cancelled" } })).count;
    } else if (action === "complete") {
      affected = (await db.order.updateMany({ where: { id: { in: ids } }, data: { status: "completed", progress: 100, completedAt: new Date() } })).count;
    } else {
      return apiError(`Action ${action} not supported for orders`, 422);
    }
  } else if (entity === "service") {
    if (action === "activate") {
      affected = (await db.service.updateMany({ where: { id: { in: ids } }, data: { status: "active" } })).count;
    } else if (action === "pause") {
      affected = (await db.service.updateMany({ where: { id: { in: ids } }, data: { status: "paused" } })).count;
    } else if (action === "delete") {
      affected = (await db.service.updateMany({ where: { id: { in: ids } }, data: { status: "deleted" } })).count;
    } else {
      return apiError(`Action ${action} not supported for services`, 422);
    }
  }

  await db.auditLog.create({
    data: {
      userId: adminId,
      action: `bulk_${action}`,
      entity,
      metadata: JSON.stringify({ count: affected, ids }),
    },
  });

  return apiOk({ affected, message: `${affected} ${entity}(s) ${action}d` });
}
