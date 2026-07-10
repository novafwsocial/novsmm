import { NextRequest } from "next/server";
import { apiError } from "@/lib/api-utils";

/**
 * POST /api/auth/verify-2fa — DEPRECATED.
 *
 * SECURITY (OWASP A04-3, P1): This route is no longer functional. The
 * 2FA flow is now consolidated into the Credentials provider in
 * `src/lib/auth.ts`:
 *
 *   1. Client calls signIn("credentials", {email, password}) without
 *      `totp` or `backupCode`.
 *   2. authorize() detects 2FA is enabled and throws "2FA_REQUIRED".
 *   3. Client prompts the user for a 6-digit TOTP OR a one-time backup
 *      code, then re-calls signIn("credentials", {email, password, totp})
 *      or signIn("credentials", {email, password, backupCode}).
 *   4. authorize() verifies the TOTP or rotates + verifies the backup
 *      code IN-LINE before issuing the session cookie.
 *
 * The previous `2fa:verified:${userId}` Setting stamp mechanism is also
 * retired — there is no longer a "credentials-only" intermediate state.
 *
 * This endpoint now returns 410 Gone so any old client still calling it
 * gets a clear signal to upgrade. There are no callers in the current
 * frontend (verified by grep), so the deprecation is safe.
 */
export async function POST(_req: NextRequest) {
  return apiError(
    "This endpoint is deprecated. 2FA verification now happens inline during sign-in — supply `totp` or `backupCode` directly to signIn('credentials').",
    410,
  );
}
