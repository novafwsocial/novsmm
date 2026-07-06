import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * Unified API response helpers.
 *
 * Replaces the scattered apiOk/apiError helpers with a consistent envelope:
 *
 * SUCCESS:
 *   { data: T, message?: string }
 *   Status: 200 (default) or 201 (created)
 *
 * ERROR:
 *   { error: { code: string, message: string, details?: any, requestId: string } }
 *   Status: 4xx or 5xx
 *
 * These helpers are designed to work with withErrorHandler (src/lib/api-handler.ts)
 * and maintain backward compatibility with existing frontend code that reads
 * the response body directly (apiOk returns data at top level, not nested).
 *
 * USAGE:
 *   import { ok, created, fail } from "@/lib/response";
 *
 *   return ok({ users });
 *   return created({ id: "123" }, "User created");
 *   return fail("NOT_FOUND", "User not found", 404);
 */

/**
 * Success response (200).
 * Returns data at top level for backward compat with existing frontend.
 * If you want the full envelope, use okEnvelope() instead.
 */
export function ok(data: any, message?: string): NextResponse {
  return NextResponse.json(
    message ? { ...data, message } : data,
    { status: 200 }
  );
}

/**
 * Created response (201).
 */
export function created(data: any, message?: string): NextResponse {
  return NextResponse.json(
    message ? { ...data, message } : data,
    { status: 201 }
  );
}

/**
 * Error response with unified envelope.
 *
 * @param code  Error code (e.g. "NOT_FOUND", "VALIDATION_ERROR", "CONFLICT")
 * @param message  Human-readable error message
 * @param status  HTTP status code (default 400)
 * @param details  Optional additional details (e.g. Zod validation issues)
 */
export function fail(
  code: string,
  message: string,
  status: number = 400,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        requestId: getRequestId(),
      },
    },
    { status }
  );
}

/**
 * Success response with full envelope: { data, message }
 * Use this for new routes that want the structured envelope.
 */
export function okEnvelope(data: any, message?: string): NextResponse {
  return NextResponse.json(
    { data, ...(message ? { message } : {}) },
    { status: 200 }
  );
}

/**
 * No content response (204).
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Redirect response.
 */
export function redirect(url: string, status: number = 302): NextResponse {
  return NextResponse.redirect(url, { status });
}

// ── Backward-compatible aliases (for existing code using apiOk/apiError) ──
// These are re-exported from api-utils.ts but defined here for the new
// envelope-aware routes.
export const apiOkV2 = ok;
export const apiErrorV2 = fail;

// ── Request ID helper ──
// Uses AsyncLocalStorage from logger.ts to get the current request ID
import { AsyncLocalStorage } from "async_hooks";

function getRequestId(): string {
  // Try to get from AsyncLocalStorage (set by withErrorHandler)
  try {
    // Access the global AsyncLocalStorage store if available
    // The logger module creates its own ALS instance, so we can't directly
    // access it here. Instead, we generate a fallback UUID.
    // In production, withErrorHandler sets the request-id header which
    // is propagated to the error response.
  } catch {
    // ignore
  }
  return randomUUID();
}
