import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/services — the service catalog (from DB).
 * Public for authenticated users; admin can see paused services with ?all=true.
 * Supports ?platform= and ?category= filters.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const platform = searchParams.get("platform");
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const services = await db.service.findMany({
    where: {
      ...(all ? {} : { status: "active" }),
      ...(platform ? { platform } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { platform: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    include: { provider: true },
    orderBy: [{ platform: "asc" }, { price: "asc" }],
  });

  return apiOk({ services });
}
