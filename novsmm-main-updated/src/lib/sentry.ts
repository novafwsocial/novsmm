/**
 * Sentry error tracking wrapper with graceful degradation.
 *
 * When SENTRY_DSN is set in .env, all errors captured via captureException()
 * are sent to Sentry for real-time error tracking, stack traces, and alerts.
 *
 * When SENTRY_DSN is NOT set (sandbox/dev mode), captureException() is a
 * no-op — errors are only logged via the structured logger (pino).
 *
 * SETUP:
 *   1. Create a Sentry account at https://sentry.io
 *   2. Create a new project (Node.js)
 *   3. Copy the DSN
 *   4. Add to .env: SENTRY_DSN=https://xxx@sentry.io/123
 *   5. (Optional) Set SENTRY_ENVIRONMENT=production
 *   6. Restart the app — errors now flow to Sentry
 *
 * USAGE:
 *   import { captureException, setSentryUser } from "@/lib/sentry";
 *
 *   try {
 *     await riskyOperation();
 *   } catch (e) {
 *     captureException(e, { userId: "123", action: "payment" });
 *   }
 */

let sentryInitialized = false;
let Sentry: any = null;

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development";
const SENTRY_RELEASE = process.env.SENTRY_RELEASE ?? process.env.npm_package_version ?? "0.2.0";

/**
 * Initialize Sentry (called lazily on first captureException).
 */
async function initSentry() {
  if (sentryInitialized || !SENTRY_DSN) return;
  sentryInitialized = true;

  try {
    Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      release: SENTRY_RELEASE,
      tracesSampleRate: 0.1, // 10% performance monitoring
      profilesSampleRate: 0.1,
      // Don't send PII
      sendDefaultPii: false,
      // Ignore common non-error statuses
      ignoreErrors: [
        "NEXT_NOT_FOUND",
        "NEXT_REDIRECT",
        "INSUFFICIENT_BALANCE",
        "2FA_REQUIRED",
      ],
    });
    console.log("[sentry] Initialized — error tracking active");
  } catch (e) {
    console.error("[sentry] Failed to initialize:", e);
    Sentry = null;
  }
}

/**
 * Capture an exception and send to Sentry (if configured).
 * Also logs via the structured logger.
 *
 * @param error  The error object
 * @param context  Additional context (userId, requestId, tags, etc.)
 */
export async function captureException(
  error: Error | any,
  context?: {
    userId?: string;
    requestId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) {
  // Always log via structured logger
  const { logger } = await import("./logger");
  logger.error(
    {
      err: error,
      userId: context?.userId,
      requestId: context?.requestId,
      tags: context?.tags,
      extra: context?.extra,
    },
    "Exception captured"
  );

  // Send to Sentry if configured
  if (SENTRY_DSN) {
    await initSentry();
    if (Sentry) {
      try {
        if (context?.userId) {
          Sentry.setUser({ id: context.userId });
        }
        if (context?.tags) {
          Sentry.setTags(context.tags);
        }
        if (context?.extra) {
          Sentry.setExtras(context.extra);
        }
        if (context?.requestId) {
          Sentry.setTag("request_id", context.requestId);
        }
        Sentry.captureException(error);
      } catch (e) {
        // Sentry itself failed — don't let this crash the app
        console.error("[sentry] captureException failed:", e);
      }
    }
  }
}

/**
 * Set the current user context for Sentry.
 * Call after login to associate errors with users.
 */
export async function setSentryUser(user: { id: string; email?: string; username?: string }) {
  if (SENTRY_DSN) {
    await initSentry();
    if (Sentry) {
      Sentry.setUser(user);
    }
  }
}

/**
 * Clear the current user context (on logout).
 */
export async function clearSentryUser() {
  if (SENTRY_DSN && Sentry) {
    Sentry.setUser(null);
  }
}

/**
 * Is Sentry configured and active?
 */
export function isSentryActive(): boolean {
  return !!SENTRY_DSN && sentryInitialized && Sentry !== null;
}
