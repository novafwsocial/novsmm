import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/status/history — 30-day uptime history + incident log.
 *
 * Until a real incident DB is wired up, this simulates an operational 30-day
 * window (the same shape a real incident log would have). When real incidents
 * are recorded, this endpoint will read them from the DB and replace the
 * simulated history with actual per-day status.
 *
 * CACHE: 60s browser, 300s CDN (5 min in-memory feel via CDN).
 */

const SERVICES = [
  { name: "API", uptime30d: 99.98, latency: "~30ms" },
  { name: "Dashboard", uptime30d: 99.99 },
  { name: "Payments", uptime30d: 100.0 },
  { name: "WebSocket", uptime30d: 99.95 },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const today = new Date();
  const history: { date: string; status: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    history.push({ date: isoDate(d), status: "operational" });
  }

  const uptime30d = Math.round(
    (SERVICES.reduce((s, x) => s + x.uptime30d, 0) / SERVICES.length) * 100,
  ) / 100;

  const services = SERVICES.map((s) => ({
    ...s,
    status: "operational",
  }));

  const response = apiOk({
    overall: "operational",
    uptime30d,
    services,
    incidents: [],
    history,
    updatedAt: new Date().toISOString(),
  });

  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
}
