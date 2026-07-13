import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { updateUserSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { raiseSecurityAlert } from "@/lib/security-alert";

/** GET /api/admin/users — paginated user list. */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  const search = searchParams.get("search");
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { email: { contains: search } },
          { name: { contains: search } },
          { username: { contains: search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        balance: true,
        heldBalance: true,
        status: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return apiOk({
    // FIX (OAuth nullable username): coerce null → "" on each user so the
    // admin table's `username: string` typing stays honest.
    users: users.map((u) => ({ ...u, username: u.username ?? "" })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  });
}

/** PATCH /api/admin/users — update role or status only.
 *
 * SECURITY (OWASP A04-2, P1): `balance` is intentionally NOT accepted.
 * All balance changes must go through /api/admin/users/adjust-balance
 * (which creates a Transaction audit row + requires a `reason`).
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { id, role, status, confirmPassword } = parsed.data;

  const user = await db.user.findUnique({ where: { id }, select: { status: true, role: true } });
  if (!user) return apiError("User not found", 404);

  // SECURITY (audit R3): Step-up authentication for role changes to/from admin.
  // When promoting to admin or demoting from admin, require the acting admin's
  // current password to prevent session hijacking from being sufficient.
  const isRoleAdminChange =
    role && ((role === "admin" && user.role !== "admin") || (role !== "admin" && user.role === "admin"));

  if (isRoleAdminChange) {
    if (!confirmPassword) {
      return apiError("Confirm your password to change admin roles.", 422);
    }
    // Verify the acting admin's password (not the target user's)
    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { passwordHash: true },
    });
    if (!admin?.passwordHash) {
      return apiError("Server error: admin account has no password", 500);
    }
    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(confirmPassword, admin.passwordHash);
    if (!valid) {
      return apiError("Incorrect password. Please try again.", 422);
    }
  }

  // SECURITY: "Last admin" protection — prevent removing admin role from
  // the last active admin, which would lock everyone out of the panel.
  if (role && role !== "admin" && user.role === "admin") {
    const activeAdminCount = await db.user.count({
      where: { role: "admin", status: "active" },
    });
    if (activeAdminCount <= 1) {
      return apiError(
        "Cannot remove admin role from the last active admin. Promote another user to admin first.",
        422
      );
    }
  }

  // SECURITY: Self-demotion guard — prevent admin from degrading their own role.
  if (role && role !== "admin" && id === adminId) {
    return apiError(
      "You cannot change your own role. Ask another admin to do this.",
      422
    );
  }

  // SECURITY: Fire security alert when promoting to admin or demoting from admin.
  if (role && role === "admin" && user.role !== "admin") {
    await raiseSecurityAlert({
      type: "role_escalation",
      userId: adminId,
      severity: "high",
      message: `Admin ${adminId} promoted user ${id} to admin role`,
    });
  } else if (role && role !== "admin" && user.role === "admin") {
    await raiseSecurityAlert({
      type: "role_demotion",
      userId: adminId,
      severity: "high",
      message: `Admin ${adminId} removed admin role from user ${id}`,
    });
  }

  const updateData: any = {};
  if (role) updateData.role = role;
  if (status) {
    updateData.status = status;
    // Notify the user
    await createNotification({
      userId: id,
      type: "system",
      title: status === "suspended" ? "Account suspended" : "Account reactivated",
      message:
        status === "suspended"
          ? "Your account has been suspended. Contact support for details."
          : "Your account is now active. Welcome back!",
      severity: status === "suspended" ? "warning" : "success",
      sendEmail: true,
    });
  }

  if (Object.keys(updateData).length === 0) {
    return apiError("No updatable fields supplied (only `role` and `status` are accepted; balance changes must go through /api/admin/users/adjust-balance).", 422);
  }

  const updated = await db.user.update({ where: { id }, data: updateData });

  await audit(adminId, "update", "user", id, { role, status });

  return apiOk({ user: updated });
}
