import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/subscriptions/seats — seat usage for the caller's active
 * subscription.
 *
 * Response:
 *   {
 *     used: number,         // currently-occupied seats (1 = just the owner)
 *     limit: number,        // max seats allowed by the plan
 *     members: Array<{      // for now, only the owner; team invites are TODO
 *       userId: string,
 *       email: string,
 *       name: string | null,
 *       role: "owner",
 *       joinedAt: string (ISO)
 *     }>
 *   }
 *
 * Returns 200 with `{ used: 1, limit: 1, members: [...] }` for free users
 * (no subscription) so the UI can render a consistent "Seats" panel.
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const [subscription, user] = await Promise.all([
    db.subscription.findFirst({
      where: { userId, status: { in: ["active", "trialing"] } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    }),
  ]);

  if (!user) return apiError("User not found", 404);

  const used = subscription?.seatsUsed ?? 1;
  const limit = subscription?.seatsLimit ?? 1;

  // Until team-member invites ship, the only member is the subscription owner.
  const members = [
    {
      userId: user.id,
      email: user.email,
      name: user.name ?? null,
      role: "owner" as const,
      joinedAt: (subscription?.createdAt ?? user.createdAt).toISOString(),
    },
  ];

  return apiOk({ used, limit, members });
}
