import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiOk, apiError, audit } from "@/lib/api-utils";
import { encryptJSON } from "@/lib/crypto-utils";

/**
 * /api/admin/social-auth — manage OAuth provider credentials.
 *
 * ADMIN-FIX-BATCH-2: previously only Google was supported (POST returned 422
 * for any other provider). The route now supports the 4 OAuth providers that
 * NextAuth can wire up out-of-the-box: google, facebook, github, twitter.
 *
 * Storage model: each provider's credentials live in a Setting row keyed
 * `oauth:<provider>`. The value is the AES-256-GCM-encrypted JSON of
 * `{ clientId, clientSecret }`. auth.ts reads these rows at request time and
 * injects them into the NextAuth providers list.
 *
 * The GET response shape is:
 *   { google: { configured: bool }, facebook: {...}, github: {...}, twitter: {...} }
 */

// Canonical list of supported providers, in the order they should appear in
// the admin UI. Exported so the frontend can import the same list.
export const SOCIAL_AUTH_PROVIDERS = [
  "google",
  "facebook",
  "github",
  "twitter",
] as const;
export type SocialAuthProvider = (typeof SOCIAL_AUTH_PROVIDERS)[number];

function isValidProvider(p: unknown): p is SocialAuthProvider {
  return typeof p === "string" && (SOCIAL_AUTH_PROVIDERS as readonly string[]).includes(p);
}

// Map provider → env-var pair used for legacy/boot-time config. If the env
// vars are set, the provider is considered configured regardless of what's
// in the DB.
const ENV_PROVIDER_VARS: Record<SocialAuthProvider, [string, string]> = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  facebook: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  twitter: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
};

/**
 * GET /api/admin/social-auth — list configured OAuth providers.
 * Returns which providers have credentials configured (without revealing
 * the secrets). Always returns an entry for every supported provider so the
 * UI can render all 4 cards deterministically.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await db.setting.findMany({
    where: { key: { startsWith: "oauth:" } },
  });
  const configuredFromDb = new Set(settings.map((s) => s.key.replace("oauth:", "")));

  const result: Record<string, { configured: boolean; source: "db" | "env" | null }> = {};
  for (const provider of SOCIAL_AUTH_PROVIDERS) {
    const [idVar, secretVar] = ENV_PROVIDER_VARS[provider];
    const hasEnv = Boolean(process.env[idVar] && process.env[secretVar]);
    if (hasEnv) {
      result[provider] = { configured: true, source: "env" };
    } else if (configuredFromDb.has(provider)) {
      result[provider] = { configured: true, source: "db" };
    } else {
      result[provider] = { configured: false, source: null };
    }
  }

  return apiOk(result);
}

/**
 * POST /api/admin/social-auth — save OAuth credentials for a provider.
 * Body: { provider: "google" | "facebook" | "github" | "twitter",
 *         clientId: string, clientSecret: string }
 *
 * Credentials are encrypted with AES-256-GCM before storing in the Setting
 * table. auth.ts dynamically reads these settings to configure the OAuth
 * providers.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return apiError("Invalid JSON body", 422); }
  const { provider, clientId, clientSecret } = body ?? {};

  if (!isValidProvider(provider)) {
    return apiError(
      `Unsupported provider '${provider}'. Must be one of: ${SOCIAL_AUTH_PROVIDERS.join(", ")}`,
      422
    );
  }
  if (!clientId || !clientSecret) {
    return apiError("Provider, clientId, and clientSecret are required", 422);
  }

  // Encrypt credentials before storing.
  const encryptedConfig = encryptJSON({ clientId, clientSecret });

  await db.setting.upsert({
    where: { key: `oauth:${provider}` },
    update: { value: encryptedConfig },
    create: { key: `oauth:${provider}`, value: encryptedConfig },
  });

  // Also mirror into process.env at runtime so any code path that reads
  // process.env (e.g. the legacy Google check, or NextAuth's auto-config
  // for the default providers) picks up the new creds immediately without
  // a server restart.
  const [idVar, secretVar] = ENV_PROVIDER_VARS[provider];
  process.env[idVar] = clientId;
  process.env[secretVar] = clientSecret;

  await audit(user!.id, "update", "setting", `oauth:${provider}`, { provider });

  return apiOk({ success: true, provider, configured: true });
}

/**
 * DELETE /api/admin/social-auth — remove a provider's stored credentials.
 * Body: { provider: "google" | "facebook" | "github" | "twitter" }
 *
 * Used by the admin UI's "disable" toggle: clearing the DB row means the
 * provider no longer shows up in NextAuth's configured providers list.
 */
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return apiError("Invalid JSON body", 422); }
  const { provider } = body ?? {};

  if (!isValidProvider(provider)) {
    return apiError(
      `Unsupported provider '${provider}'. Must be one of: ${SOCIAL_AUTH_PROVIDERS.join(", ")}`,
      422
    );
  }

  await db.setting.deleteMany({ where: { key: `oauth:${provider}` } });

  // Clear the runtime env override too (no-op if it was never set).
  const [idVar, secretVar] = ENV_PROVIDER_VARS[provider];
  delete process.env[idVar];
  delete process.env[secretVar];

  await audit(user!.id, "delete", "setting", `oauth:${provider}`, { provider });

  return apiOk({ success: true, provider, configured: false });
}
