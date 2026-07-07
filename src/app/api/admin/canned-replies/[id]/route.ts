import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";

/**
 * DELETE /api/admin/canned-replies/[id] — delete a canned reply.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const { id } = await params;
  const existing = await db.cannedReply.findUnique({ where: { id } });
  if (!existing) return apiError("Canned reply not found", 404);

  await db.cannedReply.delete({ where: { id } });
  await audit(adminId, "delete", "canned_reply", id, { title: existing.title });

  return apiOk({ ok: true });
}
