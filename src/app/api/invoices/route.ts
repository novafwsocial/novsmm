import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk } from "@/lib/api-utils";

/**
 * GET /api/invoices — list the user's invoices.
 * Supports ?format=csv for export.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  const invoices = await db.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (format === "csv") {
    const headers = ["publicId", "type", "amount", "tax", "total", "currency", "status", "createdAt"];
    const rows = [headers.join(",")];
    for (const inv of invoices) {
      rows.push([
        inv.publicId,
        inv.type,
        inv.amount,
        inv.tax,
        inv.total,
        inv.currency,
        inv.status,
        inv.createdAt.toISOString(),
      ].join(","));
    }
    return new Response(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="novsmm-invoices-${Date.now()}.csv"`,
      },
    });
  }

  return apiOk({ invoices });
}
