import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Dynamic NextAuth handler.
 *
 * On each request, checks if Google OAuth credentials have been configured
 * in the DB (Setting table, key: "oauth:google") since the last server start.
 * If so, dynamically adds the Google provider to authOptions before processing
 * the request. This allows admins to configure Google OAuth from the admin
 * panel without restarting the server.
 */

let lastGoogleConfigCheck = 0;
let cachedGoogleConfig: { clientId: string; clientSecret: string } | null = null;
const CACHE_TTL = 60_000; // 1 minute

async function loadGoogleConfigDynamically() {
  // Only check once per minute
  if (Date.now() - lastGoogleConfigCheck < CACHE_TTL) {
    return cachedGoogleConfig;
  }
  lastGoogleConfigCheck = Date.now();

  try {
    const setting = await db.setting.findUnique({
      where: { key: "oauth:google" },
    });
    if (setting) {
      const { decryptJSON } = await import("@/lib/crypto-utils");
      const creds = decryptJSON(setting.value);
      if (creds?.clientId && creds?.clientSecret) {
        cachedGoogleConfig = {
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
        };
        return cachedGoogleConfig;
      }
    }
  } catch {
    // DB might not be available — ignore
  }

  cachedGoogleConfig = null;
  return null;
}

async function getDynamicAuthOptions() {
  // If Google is already configured via env vars, no need to check DB
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return authOptions;
  }

  // Check DB for Google OAuth config
  const dbConfig = await loadGoogleConfigDynamically();
  if (dbConfig) {
    // Clone authOptions and add Google provider dynamically
    const GoogleProvider = (await import("next-auth/providers/google")).default;
    const dynamicOptions = {
      ...authOptions,
      providers: [
        ...authOptions.providers,
        GoogleProvider({
          clientId: dbConfig.clientId,
          clientSecret: dbConfig.clientSecret,
        }),
      ],
    };
    return dynamicOptions;
  }

  return authOptions;
}

// Create a wrapper that loads dynamic config before each request
async function handleRequest(req: any, res: any) {
  const options = await getDynamicAuthOptions();
  const handler = NextAuth(options);
  return handler(req, res);
}

export { handleRequest as GET, handleRequest as POST };
