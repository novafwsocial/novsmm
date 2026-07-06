import { NextResponse } from "next/server";
import { backupLastSuccessGauge } from "@/lib/metrics";

/**
 * POST /api/internal/backup-status
 *
 * Called by scripts/backup.sh after a successful backup to update the
 * `novsmm_backup_last_success_timestamp` Prometheus gauge. The BackupFailure
 * alert (monitoring/alerts.yml) fires when this timestamp is older than 24h.
 *
 * AUTH: Requires a Bearer token matching INTERNAL_API_TOKEN env var.
 *       Generate with: openssl rand -hex 32
 *
 * REQUEST:
 *   Headers: Authorization: Bearer <INTERNAL_API_TOKEN>
 *   Body (optional JSON): { "status": "success" | "failed", "sizeBytes"?: number }
 *
 * RESPONSE:
 *   200 { ok: true, timestamp: <unix-seconds> }
 *   401 { error: "missing or invalid token" }
 *   500 { error: "<message>" }
 *
 * USAGE (from backup.sh):
 *   curl -fsS -X POST \
 *     -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     -d '{"status":"success"}' \
 *     "http://localhost:3000/api/internal/backup-status"
 */

const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;

export async function POST(req: Request) {
  // ── Auth ──
  if (!INTERNAL_TOKEN) {
    // If no token is configured, refuse all calls (fail-closed).
    return NextResponse.json(
      { error: "INTERNAL_API_TOKEN not configured on server" },
      { status: 500 }
    );
  }
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "missing or invalid token" },
      { status: 401 }
    );
  }
  const token = authHeader.slice(7);
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json(
      { error: "missing or invalid token" },
      { status: 401 }
    );
  }

  // ── Parse body (optional) ──
  let status = "success";
  try {
    const body = await req.json();
    if (body && typeof body.status === "string") {
      status = body.status;
    }
  } catch {
    // Body is optional; ignore parse errors.
  }

  // ── Update metric ──
  if (status === "success") {
    const now = Math.floor(Date.now() / 1000);
    backupLastSuccessGauge.set(now);
    return NextResponse.json({ ok: true, timestamp: now });
  }

  // For "failed" status, do NOT update the gauge (leave last success as-is).
  // A separate failed-backup counter could be added here in the future.
  return NextResponse.json(
    { ok: false, note: "backup failed — metric not updated" },
    { status: 200 }
  );
}

export async function GET() {
  // Health check — does not require auth (only confirms the endpoint exists).
  return NextResponse.json({
    endpoint: "/api/internal/backup-status",
    method: "POST",
    configured: Boolean(INTERNAL_TOKEN),
  });
}
