import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api-utils";
import { validateLicense } from "@/lib/license";

/**
 * POST /api/public/validate-license
 * Public endpoint (no auth required) — used by client installations
 * to validate their license against the NOVSMM license server.
 *
 * Anti-replication: each license is bound to a domain + IP.
 * The server checks the requesting domain (Origin/Referer) and IP.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, domain } = body;

    if (!licenseKey) {
      return apiError("License key is required", 422);
    }

    // Capture the requesting IP and domain for validation
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    const requestDomain =
      domain ??
      req.headers.get("origin") ??
      req.headers.get("referer") ??
      "unknown";

    const result = await validateLicense(licenseKey, {
      domain: requestDomain,
      ip,
    });

    if (!result.valid) {
      // Log failed validation attempt
      await db.auditLog.create({
        data: {
          action: "validate_failed",
          entity: "license",
          metadata: JSON.stringify({ ip, domain: requestDomain, reason: result.reason }),
          ip,
        },
      });
      return apiError(result.reason ?? "Invalid license", 403);
    }

    // Success — return license info (without sensitive data)
    const lic = result.license;
    return apiOk({
      valid: true,
      license: {
        plan: lic.plan,
        status: lic.status,
        maxUsers: lic.maxUsers,
        maxOrders: lic.maxOrders,
        expiresAt: lic.expiresAt,
        domain: lic.domain,
      },
    });
  } catch (e: any) {
    console.error("[validate-license] error:", e);
    return apiError("License validation failed", 500);
  }
}

/**
 * GET /api/public/validate-license?key=NOVSMM-XXXX-XXXX-XXXX-XXXX
 * Alternative GET endpoint for simple validation.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const licenseKey = searchParams.get("key");
  if (!licenseKey) return apiError("License key is required", 422);

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const domain = req.headers.get("origin") ?? "unknown";

  const result = await validateLicense(licenseKey, { domain, ip });
  if (!result.valid) {
    return apiError(result.reason ?? "Invalid license", 403);
  }

  return apiOk({
    valid: true,
    plan: result.license.plan,
    status: result.license.status,
    maxUsers: result.license.maxUsers,
    maxOrders: result.license.maxOrders,
  });
}
