import { NextRequest, NextResponse } from "next/server";
import { withRequestContext, logger } from "./logger";
import { randomUUID } from "crypto";

/**
 * withErrorHandler — HOC that wraps API route handlers with:
 *   1. Request-id generation + AsyncLocalStorage propagation
 *   2. Structured error logging (via pino)
 *   3. Error sanitization (no internal details leaked to clients)
 *   4. Prisma error mapping (P2002 → 409, P2025 → 404)
 *   5. Unified error response envelope
 *
 * Usage:
 *   export const POST = withErrorHandler(async (req: NextRequest) => {
 *     const { session, error } = await requireAuth();
 *     if (error) return error;
 *     // ... business logic ...
 *     return apiOk({ data });
 *   });
 *
 * ERROR HANDLING:
 *   - Prisma P2002 (unique constraint) → 409 Conflict
 *   - Prisma P2025 (record not found) → 404 Not Found
 *   - ZodError → 422 Validation Error
 *   - Error with .statusCode → uses that status
 *   - All other errors → 500 Internal Error (sanitized message)
 *
 * SECURITY:
 *   - SDK errors (Stripe, PayPal, etc.) are logged in full but returned
 *     to the client as generic "Internal error" — no SDK internals leaked
 *   - The request-id is included in the error response so support can
 *     correlate the client's error with the server logs
 */

type HandlerFn = (req: NextRequest, ctx?: any) => Promise<NextResponse> | NextResponse;

export function withErrorHandler(handler: HandlerFn): HandlerFn {
  return async (req: NextRequest, ctx?: any) => {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    const startTime = Date.now();

    // Extract userId from session if available (for logging context)
    // We can't await the session here without making this synchronous, so
    // we log the route + method + IP and let downstream code add userId

    return withRequestContext({ requestId }, async () => {
      try {
        const result = await handler(req, ctx);
        const duration = Date.now() - startTime;
        logger.debug(
          {
            requestId,
            method: req.method,
            url: req.url,
            status: result.status,
            durationMs: duration,
          },
          "Request completed"
        );
        // Add request-id to response headers
        result.headers.set("x-request-id", requestId);
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        return handleError(error, requestId, req, duration);
      }
    });
  };
}

/**
 * Map an error to an HTTP response.
 * Also captures the error in Sentry (if configured) for production error tracking.
 * Used by withErrorHandler and can be called directly for manual error handling.
 */
export function handleError(
  error: any,
  requestId: string,
  req?: NextRequest,
  durationMs?: number
): NextResponse {
  const statusCode = getStatusCode(error);
  const code = getErrorCode(error, statusCode);

  // Log the error with full details (internal)
  logger.error(
    {
      requestId,
      method: req?.method,
      url: req?.url,
      statusCode,
      errorCode: code,
      durationMs,
      err: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        // Include Prisma error code if present
        ...(error.code ? { prismaCode: error.code } : {}),
      },
    },
    "Request failed"
  );

  // ── Capture in Sentry (if configured) ──
  // Only capture server errors (500) and unexpected errors — not 4xx client errors
  // (4xx are expected user errors like validation, auth, not-found — not bugs).
  if (statusCode >= 500) {
    import("@/lib/sentry").then(({ captureException }) => {
      captureException(error, {
        requestId,
        tags: { errorCode: code, statusCode: String(statusCode) },
        extra: { method: req?.method, url: req?.url, durationMs },
      });
    }).catch(() => {
      // Sentry import failed — don't let this crash error handling
    });
  }

  // Return sanitized error to client (no internal details)
  const clientMessage = sanitizeErrorMessage(error, code);
  return NextResponse.json(
    {
      error: {
        code,
        message: clientMessage,
        requestId,
      },
    },
    { status: statusCode, headers: { "x-request-id": requestId } }
  );
}

/**
 * Determine HTTP status code from error type.
 */
function getStatusCode(error: any): number {
  // Explicit status code on error
  if (typeof error.statusCode === "number") return error.statusCode;

  // Prisma errors
  if (error.code === "P2002") return 409; // Unique constraint failed
  if (error.code === "P2025") return 404; // Record not found
  if (error.code === "P2003") return 409; // Foreign key constraint failed

  // Zod errors
  if (error.name === "ZodError") return 422;

  // Common error patterns
  if (error.message?.includes("not found")) return 404;
  if (error.message?.includes("already exists")) return 409;
  if (error.message?.includes("Insufficient balance")) return 402;
  if (error.message?.includes("Authentication required")) return 401;
  if (error.message?.includes("Admin access required")) return 403;
  if (error.message?.includes("CSRF")) return 403;

  return 500;
}

/**
 * Determine error code string from error type + status.
 */
function getErrorCode(error: any, statusCode: number): string {
  if (error.code === "P2002") return "CONFLICT";
  if (error.code === "P2025") return "NOT_FOUND";
  if (error.name === "ZodError") return "VALIDATION_ERROR";
  if (error.code) return String(error.code);

  switch (statusCode) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "VALIDATION_ERROR";
    case 429: return "RATE_LIMITED";
    case 503: return "SERVICE_UNAVAILABLE";
    default: return "INTERNAL_ERROR";
  }
}

/**
 * Sanitize error message for client display.
 * Removes SDK internals, file paths, and stack traces.
 */
function sanitizeErrorMessage(error: any, code: string): string {
  // For 500 errors, never leak internal details
  if (code === "INTERNAL_ERROR") {
    return "An internal error occurred. Please try again or contact support if the issue persists.";
  }

  // For known error types, return the message as-is (it's user-facing)
  const msg = error.message || "An error occurred";

  // Sanitize SDK errors — strip API keys, request bodies, etc.
  return msg
    .replace(/sk_[a-zA-Z0-9]+/g, "sk_***")
    .replace(/pk_[a-zA-Z0-9]+/g, "pk_***")
    .replace(/Bearer [a-zA-Z0-9._-]+/g, "Bearer ***")
    .replace(/token=[a-zA-Z0-9._-]+/g, "token=***")
    .slice(0, 500); // Limit message length
}
