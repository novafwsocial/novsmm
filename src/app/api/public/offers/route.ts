import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/public/offers — public, rate-limited set of active marketplace
 * offers for the landing page. No auth required. Returns a maximum of 8
 * offers with limited fields (no seller info, no earnings) — just enough
 * to demo the live offers board.
 *
 * Note: the Offer model has no relation to Service (just a serviceId FK), so
 * we do a manual lookup of the service by id.
 *
 * CACHE: 60s browser, 300s CDN.
 */
export async function GET() {
  const offers = await db.offer.findMany({
    where: { status: "active" },
    take: 8,
    orderBy: { sales: "desc" },
  });

  // Hydrate service names in parallel — limited fields only.
  const serviceIds = [...new Set(offers.map((o) => o.serviceId))];
  const services = serviceIds.length
    ? await db.service.findMany({
        where: { id: { in: serviceIds } },
        select: {
          id: true,
          name: true,
          platform: true,
          cost: true,
          quality: true,
          deliveryTime: true,
        },
      })
    : [];
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const mapped = offers.map((o) => {
    const svc = serviceMap.get(o.serviceId);
    return {
      id: o.id,
      serviceName: svc?.name ?? "Service",
      platform: svc?.platform ?? "—",
      cost: o.cost,
      price: o.price,
      margin: Math.round(o.margin * 10) / 10,
      sales: o.sales,
      quality: svc?.quality ?? "standard",
      deliveryTime: svc?.deliveryTime ?? "—",
    };
  });

  const response = apiOk({ offers: mapped, count: mapped.length });
  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
}
