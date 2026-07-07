import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiOk } from "@/lib/api-utils";

/**
 * GET /api/v1/balance
 * Public API for resellers — returns the account balance.
 * Auth: Bearer nvsk_live_xxx (requires 'read' permission)
 *
 * Response (PerfectPanel contract):
 *   { status, balance, currency }
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiKey(req, "read");
  if (error) return error;

  // Re-read the balance from DB (the session-cached value may be stale by up to 30s)
  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { balance: true, currency: true },
  });

  return apiOk({
    status: "success",
    balance: Number((fresh?.balance ?? 0).toFixed(4)),
    currency: fresh?.currency || user.currency || "USD",
  });
}
