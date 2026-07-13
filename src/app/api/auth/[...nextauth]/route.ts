import NextAuth from "next-auth";
import { getDynamicAuthOptions } from "@/lib/auth";

/**
 * NextAuth route handler.
 *
 * BROAD-FIX-BATCH-1: previously this handler manually checked for the
 * Google OAuth Setting row and pushed a GoogleProvider into the static
 * authOptions.providers array. That approach only handled Google (Facebook,
 * GitHub, and Twitter credentials saved via the admin panel were never
 * registered) and mutated shared module state in a non-thread-safe way.
 *
 * The handler now calls `getDynamicAuthOptions()` which resolves ALL
 * configured OAuth providers (google, facebook, github, twitter) from both
 * env vars and the DB on each request. Admin credential changes take effect
 * on the next request without a server restart. The static `authOptions`
 * export remains for callers that only need session/callbacks (no OAuth
 * providers).
 */
async function handleRequest(req: any, res: any) {
  // DIAGNOSTIC LOG: log the URL and method for every auth request so we can
  // trace the OAuth flow (signin → callback → session) in the server logs.
  const url = typeof req?.url === "string" ? req.url : "(unknown url)";
  const method = typeof req?.method === "string" ? req.method : "(unknown method)";
  if (url.includes("callback/google") || url.includes("signin/google")) {
    console.log(`[auth-route] ${method} ${url}`);
  }

  try {
    const options = await getDynamicAuthOptions();
    const handler = NextAuth(options);
    return handler(req, res);
  } catch (e) {
    console.error(`[auth-route] ERROR handling ${method} ${url}:`, e);
    throw e;
  }
}

export { handleRequest as GET, handleRequest as POST };
