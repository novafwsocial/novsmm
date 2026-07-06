import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { updateUserSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";

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
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  });
}

/** PATCH /api/admin/users — update role, status, balance. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { id, role, status, balance } = parsed.data;

  const user = await db.user.findUnique({ where: { id }, select: { balance: true, status: true } });
  if (!user) return apiError("User not found", 404);

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
  if (balance !== undefined) updateData.balance = balance;

  const updated = await db.user.update({ where: { id }, data: updateData });

  await audit(adminId, "update", "user", id, { role, status, balance });

  return apiOk({ user: updated });
}
