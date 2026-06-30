import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/** GET /api/public/currencies — active currencies for registration/forms. */
export async function GET() {
  const currencies = await db.currency.findMany({
    where: { status: "active" },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, symbol: true },
  });
  return apiOk({ currencies });
}
