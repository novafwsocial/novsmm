import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, getAuthSession } from "@/lib/api-utils";

/**
 * Plan-based platform limits.
 * `null` means unlimited.
 *
 * free       → 3 platforms
 * starter    → 5 platforms
 * growth     → unlimited
 * enterprise → unlimited
 */
const PLAN_PLATFORM_LIMITS: Record<string, number | null> = {
  free: 3,
  starter: 5,
  growth: null,
  enterprise: null,
};

/**
 * GET /api/services — paginated service catalog.
 *
 * Query params:
 * - platform: filter by platform (Instagram, TikTok, etc.)
 * - category: filter by category (followers, likes, etc.)
 * - search: text search across name, platform, description
 * - page: page number (default 1)
 * - limit: items per page (default 24, max 60)
 * - all: include paused services (admin only; also disables platform limit)
 *
 * Plan-based platform limit:
 *   When the caller is authenticated and their plan has a platform limit
 *   (free / starter), only services belonging to the user's
 *   `connectedPlatforms` are returned. The first N platforms the user has
 *   ever ordered on are considered "connected". If the user has placed no
 *   orders yet, the N most popular platforms across the platform are used
 *   as a sensible default so the catalog is never empty on first visit.
 *
 *   The response always includes `platformLimit` (number | null) and
 *   `connectedPlatforms` (string[]) so the client can render a banner
 *   explaining the limit and an "upgrade" CTA.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const platform = searchParams.get("platform");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get("limit") ?? "24")));
  const skip = (page - 1) * limit;

  // ── Resolve caller's plan (optional auth — public catalog stays public) ──
  const session = await getAuthSession();
  const userId = (session?.user as any)?.id as string | undefined;
  const isAdmin = (session?.user as any)?.role === "admin";

  let plan = "free";
  if (userId) {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    plan = u?.plan ?? "free";
  }

  // Admins browsing with `?all=true` bypass the platform limit
  // (they need to see the full catalog for management).
  const bypassLimit = !userId || (all && isAdmin);
  // Note: PLAN_PLATFORM_LIMITS[plan] can be `null` (unlimited) or a number.
  // We use `in` operator to check if the plan exists in the map, then use
  // its value directly (null means unlimited). Only fall back to `free` if
  // the plan is not in the map at all.
  const planInMap = plan in PLAN_PLATFORM_LIMITS;
  const planPlatformLimit = planInMap ? PLAN_PLATFORM_LIMITS[plan] : PLAN_PLATFORM_LIMITS.free;
  const platformLimit = bypassLimit ? null : planPlatformLimit;

  // Compute the set of allowed platforms for this user (if a limit applies).
  let connectedPlatforms: string[] = [];
  let allowedPlatforms: string[] | null = null; // null = no limit

  if (platformLimit !== null && userId) {
    // First N distinct platforms the user has ever ordered on, in chronological order.
    const userOrders = await db.order.findMany({
      where: { userId },
      select: { platform: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const seen = new Set<string>();
    for (const o of userOrders) {
      if (o.platform && !seen.has(o.platform)) {
        seen.add(o.platform);
        connectedPlatforms.push(o.platform);
      }
    }

    // If user has used fewer than N platforms (or none), pad with the
    // most popular platforms globally so the catalog isn't empty.
    if (connectedPlatforms.length < platformLimit) {
      const remaining = platformLimit - connectedPlatforms.length;
      const popular = await db.order.groupBy({
        by: ["platform"],
        _count: { platform: true },
        orderBy: { _count: { platform: "desc" } },
        take: remaining + connectedPlatforms.length, // over-fetch then filter
      });
      for (const p of popular) {
        if (connectedPlatforms.length >= platformLimit) break;
        if (p.platform && !connectedPlatforms.includes(p.platform)) {
          connectedPlatforms.push(p.platform);
        }
      }
      // If there are still fewer than N (e.g. very few platforms in DB),
      // pad with whatever platforms exist in the catalog.
      if (connectedPlatforms.length < platformLimit) {
        const fallbackPlatforms = await db.service.findMany({
          where: { status: "active" },
          distinct: ["platform"],
          select: { platform: true },
          take: platformLimit,
        });
        for (const s of fallbackPlatforms) {
          if (connectedPlatforms.length >= platformLimit) break;
          if (s.platform && !connectedPlatforms.includes(s.platform)) {
            connectedPlatforms.push(s.platform);
          }
        }
      }
    }

    // Trim to exactly the limit (defensive — should already be ≤ limit)
    allowedPlatforms = connectedPlatforms.slice(0, platformLimit);
  } else if (platformLimit !== null && !userId) {
    // Unauthenticated caller on a "free" default plan — don't restrict
    // (the public landing catalog needs to show the full breadth of services).
    allowedPlatforms = null;
  }

  // Build the `where` clause. If allowedPlatforms is set, restrict to them.
  // If the caller explicitly requested a platform that isn't in the
  // allowed set, return an empty page (and surface the reason in the response).
  let platformBlocked = false;
  if (platform && platform !== "All") {
    if (allowedPlatforms && !allowedPlatforms.includes(platform)) {
      platformBlocked = true;
    }
  }

  const where = platformBlocked
    ? { id: "__blocked__" } // impossible filter → empty result
    : {
        ...(all ? {} : { status: "active" }),
        ...(platform && platform !== "All" ? { platform } : {}),
        ...(allowedPlatforms ? { platform: { in: allowedPlatforms } } : {}),
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { platform: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      };

  // Fetch paginated results + total count in parallel
  const [services, total] = await Promise.all([
    db.service.findMany({
      where,
      select: {
        id: true,
        name: true,
        platform: true,
        category: true,
        description: true,
        quality: true,
        deliveryTime: true,
        cost: true,
        price: true,
        minQty: true,
        maxQty: true,
        rate: true,
        status: true,
      },
      orderBy: [{ platform: "asc" }, { price: "asc" }],
      skip,
      take: limit,
    }),
    db.service.count({ where }),
  ]);

  return apiOk({
    services,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
    // Plan-enforcement metadata (consumed by the dashboard UI)
    plan,
    platformLimit,
    connectedPlatforms,
    platformBlocked,
  });
}
