import pino from "pino";

/**
 * Structured logger (pino) with request-id tracking + sensitive field redaction.
 *
 * Replaces the ~80 scattered console.log/error/warn calls across the codebase
 * with structured JSON logs that include:
 *   - Timestamp (ISO 8601)
 *   - Log level (debug/info/warn/error/fatal)
 *   - Request ID (via AsyncLocalStorage — propagates through async calls)
 *   - Module/context tag
 *   - Redacted sensitive fields (password, token, secret, apiKey, etc.)
 *
 * OUTPUT:
 *   - Development: pretty-printed to stdout (human-readable)
 *   - Production: JSON to stdout (machine-parseable, ships to Loki/Datadog)
 *
 * USAGE:
 *   import { logger, withContext } from "@/lib/logger";
 *
 *   logger.info({ userId, action: "login" }, "User logged in");
 *   logger.error({ err, userId }, "Failed to process payment");
 *
 *   // With request context (auto-includes requestId):
 *   const log = withContext({ userId, module: "orders" });
 *   log.info({ orderId }, "Order created");
 */

// ── Sensitive field redaction ──
// These fields are automatically replaced with "[Redacted]" in log output.
const REDACTED_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "secret",
  "apiKey",
  "api_key",
  "clientSecret",
  "stripeSignature",
  "x-signature",
  "authorization",
  "cookie",
  "sessionToken",
  "webhookSecret",
  "LICENSE_ENCRYPTION_KEY",
  "NEXTAUTH_SECRET",
  "MP_ACCESS_TOKEN",
  "MP_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "HUNTSMM_API_KEY",
  "GOOGLE_CLIENT_SECRET",
  "NOTIFICATIONS_SERVICE_SECRET",
  "SMTP_PASS",
];

// ── Logger configuration ──
const isDev = process.env.NODE_ENV !== "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  redact: {
    paths: REDACTED_FIELDS.map((f) => `*.${f}`).concat(REDACTED_FIELDS),
    censor: "[Redacted]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        // Production: JSON output (no pretty-print)
        formatters: {
          level: (label) => ({ level: label }),
          time: (timestamp) => ({ time: new Date(timestamp).toISOString() }),
        },
      }),
});

// ── AsyncLocalStorage for request-id propagation ──
import { AsyncLocalStorage } from "async_hooks";
const requestContext = new AsyncLocalStorage<Map<string, string>>();

/**
 * Get the current request context (requestId, userId, etc.).
 * Returns an empty Map if no context is set.
 */
function getContext(): Map<string, string> {
  return requestContext.getStore() ?? new Map();
}

/**
 * Run a function with a request context (sets requestId + userId for logging).
 * Used by the withErrorHandler HOC to propagate context through async calls.
 *
 * Usage:
 *   await withRequestContext({ requestId: uuid(), userId: "123" }, async () => {
 *     logger.info("Processing order"); // auto-includes requestId + userId
 *   });
 */
export async function withRequestContext<T>(
  context: { requestId?: string; userId?: string; [key: string]: string | undefined },
  fn: () => Promise<T>
): Promise<T> {
  const store = new Map<string, string>();
  for (const [k, v] of Object.entries(context)) {
    if (v) store.set(k, v);
  }
  return requestContext.run(store, fn);
}

/**
 * Create a child logger with additional context.
 * Merges the current request context with the provided fields.
 *
 * Usage:
 *   const log = withContext({ module: "orders", userId: "123" });
 *   log.info({ orderId }, "Order created");
 */
export function withContext(context: Record<string, any>) {
  const ctx = getContext();
  const merged: Record<string, any> = {};
  for (const [k, v] of ctx.entries()) merged[k] = v;
  Object.assign(merged, context);
  return logger.child(merged);
}

export { logger };

export default logger;
