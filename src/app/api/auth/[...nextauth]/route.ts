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
  // DIAGNOSTIC LOG: log the URL and method for every auth request so we can
  // trace the OAuth flow (signin → callback → session) in the server logs.
  const url = typeof req?.url === "string" ? req.url : "(unknown url)";
  const method = req?.method ?? "(unknown method)";
  const params = await ctx.params;
  const nextauthPath = params?.nextauth?.join("/") ?? "";

  if (
    nextauthPath.includes("callback/google") ||
    nextauthPath.includes("signin/google") ||
    nextauthPath.includes("callback/facebook") ||
    nextauthPath.includes("signin/facebook") ||
    nextauthPath.includes("callback/github") ||
    nextauthPath.includes("signin/github") ||
    nextauthPath.includes("callback/twitter") ||
    nextauthPath.includes("signin/twitter")
  ) {
    console.log(`[auth-route] ${method} /api/auth/${nextauthPath}`);
  }

  try {
    const options = await getDynamicAuthOptions();
    // NextAuth v4 App Router signature: NextAuth(req, ctx, options)
    // where ctx is { params: { nextauth: string[] } }
    const handler = NextAuth(req as any, { params: { nextauth: params.nextauth } } as any, options);
    return handler;
  } catch (e) {
    console.error(`[auth-route] ERROR handling ${method} /api/auth/${nextauthPath}:`, e);
    throw e;
  }
}

export { handleRequest as GET, handleRequest as POST };
