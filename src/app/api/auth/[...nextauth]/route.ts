import NextAuth from "next-auth";
import { getDynamicAuthOptions } from "@/lib/auth";

/**
 * NextAuth route handler for App Router (Next.js 16).
 *
 * NextAuth v4 supports App Router via the signature:
 *   NextAuth(req: NextRequest, ctx: { params }, options: AuthOptions)
 *
 * The previous implementation passed (req, res) as if it were the Pages
 * Router signature — this worked for credentials login (which doesn't need
 * OAuth provider resolution on the signin page) but broke OAuth flows
 * because the `params` (the [...nextauth] path segments like ["signin",
 * "google"]) were never passed to NextAuth, so it couldn't route the
 * request to the correct provider handler.
 *
 * Now we extract `params` from the route context and pass it correctly.
 */
async function handleRequest(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  // DIAGNOSTIC LOG: log every auth request so we can trace the full OAuth flow.
  const url = typeof req?.url === "string" ? req.url : "(unknown url)";
  const method = req?.method ?? "(unknown method)";
  const params = await ctx.params;
  const nextauthPath = params?.nextauth?.join("/") ?? "";

  // MAS-005 FIX: Log the path WITHOUT query params — the OAuth callback URL
  // contains `code` and `state` query params that are sensitive (the code
  // is a one-time authorization grant). Logging the full URL exposes these
  // in server logs. Now we strip the query string.
  const safePath = url.split("?")[0];

  // Log ALL auth requests (not just google) — shorter format for non-OAuth
  if (nextauthPath.includes("callback/") || nextauthPath.includes("signin/")) {
    console.log(`[auth-route] ${method} /api/auth/${nextauthPath}`);
  }

  try {
    const options = await getDynamicAuthOptions();
    // NextAuth v4 App Router signature: NextAuth(req, ctx, options)
    // where ctx is { params: { nextauth: string[] } }
    const result = await NextAuth(req as any, { params: { nextauth: params.nextauth } } as any, options);

    // MAS-005 FIX: Log only the status + path (no Location query params).
    // The Location header may contain the OAuth code/state on error redirects.
    if (nextauthPath.includes("callback/")) {
      const status = result?.status ?? "(unknown)";
      const location = result?.headers?.get?.("location");
      // Strip query params from the Location header for safe logging
      const safeLocation = location ? location.split("?")[0] : "(no redirect)";
      console.log(`[auth-route] callback result: status=${status}, location=${safeLocation}`);
    }

    return result;
  } catch (e) {
    console.error(`[auth-route] ERROR handling ${method} /api/auth/${nextauthPath}:`, e);
    throw e;
  }
}

export { handleRequest as GET, handleRequest as POST };
