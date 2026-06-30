import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/services — the service catalog (from DB).
 * Public for authenticated users; admin can see paused services with ?all=true.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const platform = searchParams.get("platform");

  const services = await db.service.findMany({
    where: {
      ...(all ? {} : { status: "active" }),
      ...(platform ? { platform } : {}),
    },
    include: { provider: true },
    orderBy: [{ platform: "asc" }, { price: "asc" }],
  });

  return apiOk({ services });
}
