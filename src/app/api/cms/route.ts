import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/cms — PUBLIC endpoint (no auth).
 *
 * Lists published CMS content. Query params:
 *   ?type=blog_post|faq|announcement|page
 *   ?category=general
 *   ?slug=my-post-slug   (returns a single item + increments views)
 *   ?limit=20            (default 50, max 100)
 *
 * Returns only status:"published" items. Drafts and archived items are
 * hidden — admin view is at /api/admin/cms.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const slug = searchParams.get("slug");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);

  // Single-item fetch by slug — increments views
  if (slug) {
    const item = await db.cmsContent.findUnique({
      where: { slug },
    });
    if (!item || item.status !== "published") {
      return apiOk({ item: null });
    }
    // Increment views (fire-and-forget, don't block the response)
    db.cmsContent
      .update({ where: { id: item.id }, data: { views: { increment: 1 } } })
      .catch(() => {});
    return apiOk({ item });
  }

  const where: any = { status: "published" };
  if (type) where.type = type;
  if (category) where.category = category;

  const items = await db.cmsContent.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      slug: true,
      title: true,
      excerpt: true,
      body: true,
      category: true,
      tags: true,
      status: true,
      sortOrder: true,
      views: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiOk({ items });
}
