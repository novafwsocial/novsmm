import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/** GET /api/public/currencies — active currencies with rates for price conversion. */
export async function GET() {
  const currencies = await db.currency.findMany({
    where: { status: "active" },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, symbol: true, rate: true },
  });
  return apiOk({ currencies });
}
