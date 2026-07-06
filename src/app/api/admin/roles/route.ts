import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { z } from "zod";

const RESOURCES = [
  "user", "order", "service", "wallet", "ticket", "provider",
  "payment_method", "license", "api_key", "currency", "language",
  "notification", "setting", "webhook", "refund", "coupon",
];
const ACTIONS = ["read", "create", "update", "delete", "approve"];

const createRoleSchema = z.object({
  name: z.string().min(2).toLowerCase(),
  description: z.string().default(""),
  color: z.string().default("#64748b"),
});

const updatePermissionsSchema = z.object({
  roleId: z.string(),
  permissions: z.array(
    z.object({
      resource: z.string(),
      actions: z.string(),
    })
  ),
});

/** GET /api/admin/roles — list all roles with permissions + user counts. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const roles = await db.role.findMany({
    include: {
      permissions: true,
      _count: { select: {} },
    },
    orderBy: { name: "asc" },
  });

  // Get user counts per role
  const userCounts = await db.user.groupBy({
    by: ["role"],
    _count: { id: true },
  });
  const countMap: Record<string, number> = {};
  userCounts.forEach((u) => (countMap[u.role] = u._count.id));

  return apiOk({
    roles: roles.map((r) => ({
      ...r,
      userCount: countMap[r.name] ?? 0,
    })),
    resources: RESOURCES,
    actions: ACTIONS,
  });
}

/** POST /api/admin/roles — create a custom role. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  try {
    const role = await db.role.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        color: parsed.data.color,
        isSystem: false,
      },
    });
    await audit(adminId, "create", "role", role.id, { name: role.name });
    return apiOk({ role, message: "Role created" }, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Role name already exists", 409);
    return apiError("Failed to create role", 500);
  }
}

/** PATCH /api/admin/roles — update role permissions or description. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();

  // Permission update mode
  if (body.permissions && body.roleId) {
    const parsed = updatePermissionsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const role = await db.role.findUnique({ where: { id: parsed.data.roleId } });
    if (!role) return apiError("Role not found", 404);
    if (role.isSystem && role.name === "admin") {
      return apiError("Cannot modify admin role permissions", 403);
    }

    // Delete existing permissions and recreate
    await db.permission.deleteMany({ where: { roleId: parsed.data.roleId } });
    for (const perm of parsed.data.permissions) {
      await db.permission.create({
        data: { roleId: parsed.data.roleId, resource: perm.resource, actions: perm.actions },
      });
    }

    await audit(adminId, "update", "role", parsed.data.roleId, { permissions: parsed.data.permissions });

    return apiOk({ message: "Permissions updated" });
  }

  // Description/color update
  const { id, description, color } = body;
  if (!id) return apiError("Role ID required", 422);

  const role = await db.role.findUnique({ where: { id } });
  if (!role) return apiError("Role not found", 404);
  if (role.isSystem && body.name && body.name !== role.name) {
    return apiError("Cannot rename system role", 403);
  }

  const updated = await db.role.update({
    where: { id },
    data: {
      ...(description !== undefined ? { description } : {}),
      ...(color !== undefined ? { color } : {}),
    },
  });

  return apiOk({ role: updated });
}

/** DELETE /api/admin/roles — delete a custom role (system roles protected). */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("Role ID required", 422);

  const role = await db.role.findUnique({ where: { id } });
  if (!role) return apiError("Role not found", 404);
  if (role.isSystem) return apiError("Cannot delete system role", 403);

  await db.role.delete({ where: { id } });
  await audit(adminId, "delete", "role", id);

  return apiOk({ message: "Role deleted" });
}
