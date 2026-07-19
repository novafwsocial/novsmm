import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-utils";

/**
 * GET /api/auth/debug-oauth — diagnostic endpoint for OAuth configuration.
 *
 * This route is SAFE to expose (it only reveals whether credentials are
 * configured, not the credentials themselves). It helps diagnose why
 * Google login redirects to the landing page instead of completing.
 *
 * Returns:
 *   {
 *     envVars: { GOOGLE_CLIENT_ID: bool, GOOGLE_CLIENT_SECRET: bool, ... },
 *     dbSettings: [{ key: "oauth:google", hasValue: bool, decrypts: bool, hasClientId: bool, hasClientSecret: bool }],
 *     encryptionKey: { set: bool, length: number, format: "hex"|"base64"|"invalid" },
 *     nextauthUrl: string,
 *     googleRedirectUri: string,
 *     timestamp: string
 *   }
 */
export async function GET() {
  // Diagnostics reveal configuration state and must never be public.
  const { error } = await requireAdmin();
  if (error) return error;

  const envVars: Record<string, boolean> = {};
  const providers = ["google", "facebook", "github", "twitter"] as const;
  const envVarMap: Record<string, [string, string]> = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    facebook: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    twitter: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
  };

  for (const provider of providers) {
    const [idVar, secretVar] = envVarMap[provider];
    envVars[idVar] = Boolean(process.env[idVar]);
    envVars[secretVar] = Boolean(process.env[secretVar]);
  }

  // Check DB settings
  const dbSettings: any[] = [];
  try {
    const settings = await db.setting.findMany({
      where: { key: { startsWith: "oauth:" } },
    });

    for (const s of settings) {
      let decrypts = false;
      let hasClientId = false;
      let hasClientSecret = false;
      try {
        const { decryptJSON } = await import("@/lib/crypto-utils");
        const creds = decryptJSON(s.value);
        if (creds) {
          decrypts = true;
          hasClientId = Boolean(creds.clientId);
          hasClientSecret = Boolean(creds.clientSecret);
        }
      } catch {
        // decryption failed
      }
      dbSettings.push({
        key: s.key,
        hasValue: Boolean(s.value),
        valueLength: s.value?.length ?? 0,
        decrypts,
        hasClientId,
        hasClientSecret,
      });
    }
  } catch (e: any) {
    dbSettings.push({ error: e?.message ?? "DB query failed" });
  }

  // Check encryption key
  const encKey = process.env.LICENSE_ENCRYPTION_KEY;
  const encKeyInfo = {
    set: Boolean(encKey),
    length: encKey?.length ?? 0,
    format: encKey
      ? (/^[0-9a-fA-F]+$/.test(encKey)
        ? "hex"
        : /^[A-Za-z0-9+/]+={0,2}$/.test(encKey)
        ? "base64"
        : "invalid")
      : "not-set",
  };

  const nextauthUrl = process.env.NEXTAUTH_URL || "(not set)";
  const googleRedirectUri = `${nextauthUrl.replace(/\/$/, "")}/api/auth/callback/google`;

  return Response.json({
    envVars,
    dbSettings,
    encryptionKey: encKeyInfo,
    nextauthUrl,
    googleRedirectUri,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
