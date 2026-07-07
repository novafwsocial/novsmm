import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk } from "@/lib/api-utils";

/**
 * GET /api/canned-replies — list canned replies for the current user.
 *
 * Available to admin AND support roles (so support staff can use canned
 * replies when answering tickets). Users (resellers, agencies) get an
 * empty list — canned replies are a staff tool, not a customer feature.
 *
 * Optional query: ?category=refund
 *
 * Also accepts an `incrementUsage=true&ids=...` query to bump usageCount
 * on the listed IDs (called by the ticket composer after a reply is sent).
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const user = session!.user as any;

  // Only admins + support can use canned replies
  if (user.role !== "admin" && user.role !== "support") {
    return apiOk({ items: [] });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const incrementUsage = searchParams.get("incrementUsage") === "true";
  const idsParam = searchParams.get("ids");

  if (incrementUsage && idsParam) {
    // Bump usageCount on the supplied IDs (comma-separated)
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length > 0) {
      await db.cannedReply.updateMany({
        where: { id: { in: ids } },
        data: { usageCount: { increment: 1 } },
      });
    }
    return apiOk({ ok: true });
  }

  const where: any = {};
  if (category) where.category = category;

  const items = await db.cannedReply.findMany({
    where,
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      language: true,
      usageCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiOk({ items });
}
