import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiOk, apiError, audit } from "@/lib/api-utils";
import { encryptJSON, decryptJSON } from "@/lib/crypto-utils";

/**
 * GET /api/admin/social-auth — list configured OAuth providers.
 * Returns which providers have credentials configured (without revealing the secrets).
 */
export async function GET() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const settings = await db.setting.findMany({
    where: {
      key: { startsWith: "oauth:" },
    },
  });

  const result: Record<string, { configured: boolean }> = {};
  for (const s of settings) {
    const provider = s.key.replace("oauth:", "");
    result[provider] = { configured: true };
  }

  // Google is also configured if GOOGLE_CLIENT_ID env var is set
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    result.google = { configured: true };
  }

  return apiOk(result);
}

/**
 * POST /api/admin/social-auth — save OAuth credentials for a provider.
 * Body: { provider: "google", clientId: "...", clientSecret: "..." }
 *
 * Credentials are encrypted with AES-256-GCM before storing in the Setting table.
 * The auth.ts dynamically reads these settings to configure the OAuth providers.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { provider, clientId, clientSecret } = body;

  if (!provider || !clientId || !clientSecret) {
    return apiError("Provider, clientId, and clientSecret are required", 422);
  }

  if (provider !== "google") {
    return apiError(`Provider '${provider}' is not supported. Only 'google' is supported.`, 422);
  }

  // Encrypt credentials before storing
  const encryptedConfig = encryptJSON({
    clientId,
    clientSecret,
  });

  // Store in Setting table with key "oauth:google"
  await db.setting.upsert({
    where: { key: `oauth:${provider}` },
    update: { value: encryptedConfig },
    create: { key: `oauth:${provider}`, value: encryptedConfig },
  });

  // Also set as env vars at runtime so auth.ts can pick them up immediately
  // (auth.ts checks process.env first, then DB settings)
  process.env.GOOGLE_CLIENT_ID = clientId;
  process.env.GOOGLE_CLIENT_SECRET = clientSecret;

  await audit(user!.id, "update", "setting", `oauth:${provider}`, { provider });

  return apiOk({ success: true, provider, configured: true });
}
