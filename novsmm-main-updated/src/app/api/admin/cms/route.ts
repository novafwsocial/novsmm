import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";

/**
 * GET /api/admin/cms — list ALL CMS content (including drafts).
 * Optional query: ?type=blog_post, ?status=draft
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;

  const items = await db.cmsContent.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return apiOk({ items });
}

/**
 * POST /api/admin/cms — create new CMS content.
 * Auto-generates slug from title if not provided.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json().catch(() => ({}));
  const {
    type,
    slug,
    title,
    excerpt,
    body: contentBody,
    category,
    tags,
    status,
    sortOrder,
  } = body;

  if (!type || !title) {
    return apiError("type and title are required", 422);
  }

  // SECURITY (S-L-005): validate body size — max 100KB. Without this,
  // an admin could create a post with 100MB of markdown, and every GET
  // to /api/cms?slug=... would serve it to all visitors (storage bloat
  // + bandwidth cost).
  const MAX_BODY_SIZE = 100_000;
  if (contentBody && typeof contentBody === "string" && contentBody.length > MAX_BODY_SIZE) {
    return apiError(`Body too long (max ${MAX_BODY_SIZE / 1000}KB)`, 422);
  }

  const validTypes = ["blog_post", "faq", "announcement", "page"];
  if (!validTypes.includes(type)) {
    return apiError(`type must be one of: ${validTypes.join(", ")}`, 422);
  }

  // Generate slug from title if not provided
  let finalSlug = slug?.trim() || slugify(title);

  // Ensure slug uniqueness
  let suffix = 1;
  let baseSlug = finalSlug;
  while (await db.cmsContent.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${suffix++}`;
  }

  const isPublished = status === "published";
  const item = await db.cmsContent.create({
    data: {
      type,
      slug: finalSlug,
      title,
      excerpt: excerpt ?? "",
      body: contentBody ?? "",
      category: category ?? "general",
      tags: tags ?? "",
      status: status ?? "draft",
      authorId: adminId,
      sortOrder: sortOrder ?? 0,
      publishedAt: isPublished ? new Date() : null,
    },
  });

  await audit(adminId, "create", "cms_content", item.id, { type, slug: finalSlug, title });

  return apiOk({ item }, 201);
}

/**
 * PATCH /api/admin/cms — update by id.
 * Body: { id, ...fields }
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json().catch(() => ({}));
  const { id, slug, title, excerpt, body: contentBody, category, tags, status, sortOrder } = body;

  if (!id) return apiError("id is required", 422);

  const existing = await db.cmsContent.findUnique({ where: { id } });
  if (!existing) return apiError("Content not found", 404);

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (excerpt !== undefined) updateData.excerpt = excerpt;
  if (contentBody !== undefined) updateData.body = contentBody;
  if (category !== undefined) updateData.category = category;
  if (tags !== undefined) updateData.tags = tags;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  if (slug !== undefined && slug !== existing.slug) {
    // Validate new slug uniqueness
    const conflict = await db.cmsContent.findUnique({ where: { slug } });
    if (conflict && conflict.id !== id) {
      return apiError("Slug already in use", 409);
    }
    updateData.slug = slug;
  }

  if (status !== undefined && status !== existing.status) {
    updateData.status = status;
    if (status === "published" && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }
  }

  const item = await db.cmsContent.update({ where: { id }, data: updateData });

  await audit(adminId, "update", "cms_content", id, { fields: Object.keys(updateData) });

  return apiOk({ item });
}

/** Generate a URL-safe slug from a string. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || `post-${Date.now()}`;
}
