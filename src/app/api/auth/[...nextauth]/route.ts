import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * NextAuth route handler with dynamic Google OAuth provider loading.
 *
 * On each request, checks if Google OAuth credentials are stored in the DB
 * (Setting table, key: "oauth:google"). If so, adds the Google provider
 * to authOptions.providers before processing the request.
 *
 * This allows admins to configure Google OAuth from the admin panel without
 * restarting the server.
 */

// Cache the DB check to avoid hitting the database on every request
let googleProviderAdded = false;
let lastCheck = 0;
const CHECK_INTERVAL = 30_000; // Check every 30 seconds

async function ensureGoogleProvider() {
  // If already added via env vars, skip
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return;
  }

  // Only check DB every 30 seconds
  if (googleProviderAdded && Date.now() - lastCheck < CHECK_INTERVAL) {
    return;
  }
  lastCheck = Date.now();

  try {
    const setting = await db.setting.findUnique({
      where: { key: "oauth:google" },
    });

    if (setting) {
      const { decryptJSON } = await import("@/lib/crypto-utils");
      const creds = decryptJSON(setting.value);

      if (creds?.clientId && creds?.clientSecret) {
        // Set env vars so auth.ts picks them up
        process.env.GOOGLE_CLIENT_ID = creds.clientId;
        process.env.GOOGLE_CLIENT_SECRET = creds.clientSecret;

        // If Google provider isn't already in the providers array, add it
        if (!googleProviderAdded) {
          const GoogleProvider = (await import("next-auth/providers/google")).default;
          authOptions.providers.push(
            GoogleProvider({
              clientId: creds.clientId,
              clientSecret: creds.clientSecret,
            })
          );
          googleProviderAdded = true;
          console.log("[auth] Google OAuth provider added from DB settings");
        }
      }
    }
  } catch (e) {
    // DB might not be available during build — ignore
  }
}

// Wrapper that ensures Google provider is loaded before handling the request
async function handleRequest(req: any, res: any) {
  await ensureGoogleProvider();
  const handler = NextAuth(authOptions);
  return handler(req, res);
}

export { handleRequest as GET, handleRequest as POST };
