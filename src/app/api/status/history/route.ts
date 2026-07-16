import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/status/history — 30-day uptime history + incident log.
 *
 * Historical uptime/incident storage is not configured yet. This endpoint
 * therefore returns an explicit empty history instead of fabricated SLA
 * percentages or synthetic incident-free days.
 *
 * CACHE: 60s browser, 300s CDN (5 min in-memory feel via CDN).
 */

const SERVICES = [
  { name: "API", latency: "live probe only" },
  { name: "Dashboard" },
  { name: "Payments" },
  { name: "WebSocket" },
];

export async function GET() {
  const services = SERVICES.map((s) => ({
    ...s,
    status: "unknown",
    uptime30d: null,
  }));

  const response = apiOk({
    overall: "unknown",
    uptime30d: null,
    services,
    incidents: [],
    history: [],
    historicalDataAvailable: false,
    notice: "Historical uptime data is not configured.",
    updatedAt: new Date().toISOString(),
  });

  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
}
