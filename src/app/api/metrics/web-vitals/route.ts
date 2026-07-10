import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/metrics/web-vitals — receive Web Vitals from the browser.
 *
 * The WebVitals component (src/components/novsmm/web-vitals.tsx) sends
 * Core Web Vitals metrics (LCP, CLS, INP, TTFB, FCP) via navigator.sendBeacon
 * to this endpoint. This endpoint accepts the data and silently discards it
 * (returns 204 No Content).
 *
 * In the future, this could be extended to:
 *   - Store metrics in the DB for analysis
 *   - Send to a monitoring service (Datadog, New Relic, etc.)
 *   - Trigger alerts on poor performance
 *
 * For now, the endpoint exists primarily to prevent 404 errors in the
 * browser console (which pollute logs and can mask real errors).
 */
export async function POST(req: NextRequest) {
  try {
    // Read the body (sendBeacon sends it as a Blob, not JSON)
    const text = await req.text();
    const data = text ? JSON.parse(text) : null;

    // Silently accept — in production this would log to a monitoring service
    // For now, just log to server console at debug level (not errors)
    if (data && process.env.NODE_ENV === "development") {
      console.log("[web-vitals]", data.name, data.value, data.rating);
    }

    // Return 204 No Content — sendBeacon doesn't need a response body
    return new NextResponse(null, { status: 204 });
  } catch {
    // Don't fail on malformed data — web vitals are best-effort
    return new NextResponse(null, { status: 204 });
  }
}

// GET — for health checks / manual testing
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/metrics/web-vitals",
    method: "POST",
    description: "Receives Core Web Vitals metrics from the browser",
  });
}
