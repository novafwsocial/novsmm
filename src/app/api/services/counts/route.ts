import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/services/counts — returns service counts grouped by platform.
 * Used by the marketplace to show accurate per-platform counts in the filter bar.
 * Public endpoint (no auth required) — only counts active services.
 */
export async function GET() {
  const groups = await db.service.groupBy({
    by: ["platform"],
    where: { status: "active" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const g of groups) {
    counts[g.platform] = g._count.id;
    total += g._count.id;
  }

  return apiOk({ counts, total });
}
