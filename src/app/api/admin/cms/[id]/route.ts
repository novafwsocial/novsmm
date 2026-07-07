import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";

/**
 * GET /api/admin/cms/[id] — single CMS content item (admin view).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const item = await db.cmsContent.findUnique({ where: { id } });
  if (!item) return apiError("Content not found", 404);

  return apiOk({ item });
}

/**
 * PATCH /api/admin/cms/[id] — update by id.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const { id } = await params;
  const existing = await db.cmsContent.findUnique({ where: { id } });
  if (!existing) return apiError("Content not found", 404);

  const body = await req.json().catch(() => ({}));
  const { title, excerpt, body: contentBody, category, tags, status, sortOrder, slug } = body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (excerpt !== undefined) updateData.excerpt = excerpt;
  if (contentBody !== undefined) updateData.body = contentBody;
  if (category !== undefined) updateData.category = category;
  if (tags !== undefined) updateData.tags = tags;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  if (slug !== undefined && slug !== existing.slug) {
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

/**
 * DELETE /api/admin/cms/[id] — hard delete a CMS content item.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const { id } = await params;
  const existing = await db.cmsContent.findUnique({ where: { id } });
  if (!existing) return apiError("Content not found", 404);

  await db.cmsContent.delete({ where: { id } });
  await audit(adminId, "delete", "cms_content", id, { title: existing.title, slug: existing.slug });

  return apiOk({ ok: true });
}
