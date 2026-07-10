import { apiOk } from "@/lib/api-utils";
import {
  getConfiguredSocialProviders,
  SOCIAL_AUTH_PROVIDERS,
} from "@/lib/auth";

/**
 * GET /api/auth/social-providers — public list of which OAuth providers
 * have been configured by the admin (or via env vars).
 *
 * BROAD-FIX-BATCH-1: the login + register screens need to know which
 * "Continue with X" buttons to render. Previously they hardcoded a single
 * Google button. Now they fetch this endpoint and render a button per
 * configured provider. Unconfigured providers are hidden so users never
 * click a button that fails.
 *
 * Response shape:
 *   { providers: ["google", "facebook", ...] }
 *
 * The response is safe to expose publicly — it returns only provider IDs,
 * never the credentials themselves. Cached for 60s browser / 300s CDN since
 * admin OAuth changes are infrequent.
 */
export async function GET() {
  // Resolve configured providers. If the DB is unreachable (e.g. during
  // build), fall back to an empty list — the login screen will just hide
  // the social buttons.
  let providers: string[] = [];
  try {
    providers = await getConfiguredSocialProviders();
  } catch {
    providers = [];
  }

  // Defensive: filter to the canonical list in case the DB somehow contains
  // an unknown provider key.
  const valid = providers.filter((p) =>
    (SOCIAL_AUTH_PROVIDERS as readonly string[]).includes(p as any)
  );

  const response = apiOk({ providers: valid });
  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
}
