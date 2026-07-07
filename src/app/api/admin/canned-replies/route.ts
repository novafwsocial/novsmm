import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";

/**
 * GET /api/admin/canned-replies — list all canned replies.
 * Optional query: ?category=refund, ?language=en
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const language = searchParams.get("language");

  const where: any = {};
  if (category) where.category = category;
  if (language) where.language = language;

  const items = await db.cannedReply.findMany({
    where,
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  return apiOk({ items });
}

/**
 * POST /api/admin/canned-replies — create a new canned reply.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json().catch(() => ({}));
  const { title, body: replyBody, category, language } = body;

  if (!title || !replyBody) {
    return apiError("title and body are required", 422);
  }

  const item = await db.cannedReply.create({
    data: {
      title,
      body: replyBody,
      category: category ?? "general",
      language: language ?? "en",
      createdBy: adminId,
    },
  });

  await audit(adminId, "create", "canned_reply", item.id, { title, category });

  return apiOk({ item }, 201);
}

/**
 * PATCH /api/admin/canned-replies — update by id.
 * Body: { id, title?, body?, category?, language? }
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json().catch(() => ({}));
  const { id, title, body: replyBody, category, language } = body;

  if (!id) return apiError("id is required", 422);

  const existing = await db.cannedReply.findUnique({ where: { id } });
  if (!existing) return apiError("Canned reply not found", 404);

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (replyBody !== undefined) updateData.body = replyBody;
  if (category !== undefined) updateData.category = category;
  if (language !== undefined) updateData.language = language;

  const item = await db.cannedReply.update({ where: { id }, data: updateData });

  await audit(adminId, "update", "canned_reply", id, { fields: Object.keys(updateData) });

  return apiOk({ item });
}
