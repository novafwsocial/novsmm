import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/payment-methods — public list of active payment methods.
 * CACHE: 60s browser, 300s CDN — payment methods rarely change.
 */
export async function GET() {
  const methods = await db.paymentMethod.findMany({
    where: { status: "active" },
    orderBy: { sortOrder: "asc" },
    // Don't expose config (contains encrypted credentials) to the public API
    select: {
      id: true,
      name: true,
      glyph: true,
      tone: true,
      settleTime: true,
      fee: true,
      currencies: true,
      sortOrder: true,
    },
  });
  const response = apiOk({ methods });
  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
}
