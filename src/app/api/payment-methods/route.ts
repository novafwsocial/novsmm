import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/** GET /api/payment-methods — public list of active payment methods. */
export async function GET() {
  const methods = await db.paymentMethod.findMany({
    where: { status: "active" },
    orderBy: { sortOrder: "asc" },
  });
  return apiOk({ methods });
}
