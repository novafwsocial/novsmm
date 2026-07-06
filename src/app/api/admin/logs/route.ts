import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiOk } from "@/lib/api-utils";

/**
 * GET /api/admin/logs — audit log viewer for admins.
 *
 * Query params:
 * - entity: filter by entity (user, order, service, …)
 * - action: filter by action (create, update, delete, login, …)
 * - limit: max rows (default 100, capped at 500) — ignored when format=csv
 * - format: "csv" → returns a downloadable CSV file with all matching rows
 *           (default: JSON)
 *
 * CSV columns:
 *   id, userId, userEmail, action, entity, entityId, metadata, ip, createdAt
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity");
  const action = searchParams.get("action");
  const format = searchParams.get("format");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  const where = {
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
  };

  // ── CSV export path ──
  // Pulls ALL matching rows (no `take`) so admins can fully export the
  // filtered audit trail. CSV cells are RFC-4180 quoted; newlines inside
  // metadata are preserved within quoted fields.
  if (format === "csv") {
    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const csv = toCsv([
      ["id", "userId", "userEmail", "action", "entity", "entityId", "metadata", "ip", "createdAt"],
      ...logs.map((l) => [
        l.id,
        l.userId ?? "",
        l.user?.email ?? "",
        l.action,
        l.entity,
        l.entityId ?? "",
        // metadata is now a Json column — Prisma returns the parsed object.
        // CSV needs a string, so we serialize it back. Null → empty cell.
        l.metadata ? JSON.stringify(l.metadata) : "",
        l.ip ?? "",
        l.createdAt.toISOString(),
      ]),
    ]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // ── Default JSON path ──
  const logs = await db.auditLog.findMany({
    where,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return apiOk({ logs, count: logs.length });
}

/**
 * Minimal RFC-4180 CSV serializer.
 * - Wraps any cell containing `,`, `"`, `\n`, or `\r` in double quotes.
 * - Escapes embedded `"` by doubling them.
 * - Uses `\r\n` line endings per spec.
 */
function toCsv(rows: (string | number)[][]): string {
  const escape = (val: string | number): string => {
    const s = String(val ?? "");
    if (/[",\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return rows.map((r) => r.map(escape).join(",")).join("\r\n") + "\r\n";
}
