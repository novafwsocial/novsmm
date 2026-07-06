import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/services — paginated service catalog.
 *
 * Query params:
 * - platform: filter by platform (Instagram, TikTok, etc.)
 * - category: filter by category (followers, likes, etc.)
 * - search: text search across name, platform, description
 * - page: page number (default 1)
 * - limit: items per page (default 24, max 60)
 * - all: include paused services (admin only)
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

  // Cache: 30s browser, 60s CDN — catalog can be slightly stale
  response.headers.set("Cache-Control", "public, max-age=30, s-maxage=60");
  return response;
}
