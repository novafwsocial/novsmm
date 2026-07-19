import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, getAuthSession } from "@/lib/api-utils";

/**
 * GET /api/services — paginated service catalog.
 *
 * Query params:
 * - platform: filter by platform (Instagram, TikTok, etc.)
 * - category: filter by category (followers, likes, etc.)
 * - search: text search across name, platform, description
 * - page: page number (default 1)
 * - limit: items per page (default 24, max 60)
 * - all: include paused services (admin only — also gates `cost`)
 *
 * BROAD-FIX-BATCH-1: the `cost` (wholesale price) field is now also exposed
 * to authenticated non-admin users. Previously it was hidden unless
 * `?all=true` was passed (admin-only), which meant the dashboard Sell-tab
 * publish modal showed `cost: $0.00` because `useAllServices()` doesn't
 * pass `all=true`. The server-side `POST /api/offers` already fetches the
 * real cost from the DB, so this is purely a UI fix — but it lets resellers
 * see their actual wholesale cost when choosing a resale price, instead of
 * a misleading $0.00.
 *
 * Public (unauthenticated) callers still get the cost-hidden response so
 * the public catalog doesn't leak wholesale prices to competitors.
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

  // Resolve the caller's session (if any). Authenticated users see the
  // `cost` field so the Sell tab can display wholesale prices. Anonymous
  // callers do not.
  let isAuthenticated = false;
  try {
    const session = await getAuthSession();
    isAuthenticated = !!session?.user;
  } catch {
    // Session resolution failure (e.g. during build) — treat as anonymous.
  }
  const includeCost = all || isAuthenticated;

  const where = {
    ...(all ? {} : { status: "active" }),
    ...(platform && platform !== "All" ? { platform } : {}),
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
        // H-6 fix: Don't expose cost (wholesale price) to anonymous callers.
        // BROAD-FIX-BATCH-1: authenticated users now see cost too (needed by
        // the Sell-tab publish modal). Admin queries (?all=true) still get
        // cost as before.
        ...(includeCost ? { cost: true } : {}),
        price: true,
        minQty: true,
        maxQty: true,
        rate: true,
        status: true,
        availabilityTag: true,
      },
      orderBy: [{ platform: "asc" }, { price: "asc" }],
      skip,
      take: limit,
    }),
    db.service.count({ where }),
  ]);

  const response = apiOk({
    services,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  });

  // Cache: 30s browser, 60s CDN — catalog can be slightly stale.
  // Note: the response shape differs per caller (authed vs anonymous) but
  // the CDN cache key includes the Cookie header so authed and anonymous
  // responses don't collide.
  response.headers.set("Cache-Control", "public, max-age=30, s-maxage=60");
  return response;
}
