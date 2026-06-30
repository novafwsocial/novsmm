import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/export/orders?format=csv
 * GET /api/export/transactions?format=csv
 * Exports the user's data as CSV or JSON.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "orders"; // orders | transactions
  const format = searchParams.get("format") ?? "csv"; // csv | json

  let data: any[];
  let headers: string[];

  if (type === "orders") {
    data = await db.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    headers = ["publicId", "serviceName", "platform", "quantity", "totalPrice", "status", "progress", "createdAt"];
  } else if (type === "transactions") {
    data = await db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    headers = ["publicId", "type", "amount", "description", "status", "method", "createdAt"];
  } else {
    return apiError("Invalid export type. Use 'orders' or 'transactions'.", 400);
  }

  if (format === "json") {
    return apiOk({ type, count: data.length, data });
  }

  // CSV format
  const csvRows = [headers.join(",")];
  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val instanceof Date) return val.toISOString();
      if (typeof val === "string" && val.includes(",")) return `"${val.replace(/"/g, '""')}"`;
      return val ?? "";
    });
    csvRows.push(values.join(","));
  }

  const csv = csvRows.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="novsmm-${type}-${Date.now()}.csv"`,
    },
  });
}
