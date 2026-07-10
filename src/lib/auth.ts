import type { NextAuthOptions, Provider } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { audit } from "@/lib/api-utils";
import { verify2FAToken, decrypt2FASecret } from "@/lib/two-factor";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache";

// ── Brute-force protection: Redis-backed failed attempt tracking ──
// Falls back to in-memory when Redis is not available (sandbox/dev mode).
// In production with Redis, this is shared across all instances so a
// brute-force attack can't bypass per-instance limits by load-balancing.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory fallback
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

async function trackFailedAttempt(key: string) {
  const redisKey = `login_lock:${key}`;

  // Try Redis
  const existing = await cacheGet<{ count: number; lockedUntil: number }>(redisKey);
  const count = (existing?.count ?? 0) + 1;
  const lockedUntil = count >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCK_DURATION_MS : 0;

  await cacheSet(redisKey, { count, lockedUntil }, Math.ceil(LOCK_DURATION_MS / 1000));

  // Also update in-memory (for immediate consistency in fallback mode)
  loginAttempts.set(key, { count, lockedUntil });
}

async function isAccountLocked(key: string): Promise<{ locked: boolean; lockedUntil?: number }> {
  const redisKey = `login_lock:${key}`;

  // Try Redis first
  const data = await cacheGet<{ count: number; lockedUntil: number }>(redisKey);
  if (data) {
    if (data.lockedUntil > Date.now()) {
      return { locked: true, lockedUntil: data.lockedUntil };
    }
    return { locked: false };
  }

  // Fallback to in-memory
  const mem = loginAttempts.get(key);
  if (mem && mem.lockedUntil > Date.now()) {
    return { locked: true, lockedUntil: mem.lockedUntil };
  }
  return { locked: false };
}

async function clearFailedAttempts(key: string) {
  const redisKey = `login_lock:${key}`;
  await cacheDel(redisKey);
  loginAttempts.delete(key);
}

/**
 * NextAuth configuration.
 *
 * Providers:
 * - Credentials (email + password, validated against DB with bcrypt)
 * - OAuth providers (Google, Facebook, GitHub, Twitter) — registered
 *   dynamically based on which credentials are configured.
 *
 * BROAD-FIX-BATCH-1: previously only GoogleProvider was wired up, but the
 * admin social-auth panel (ADMIN-FIX-BATCH-2) lets admins configure all
 * four providers (oauth:google, oauth:facebook, oauth:github, oauth:twitter
 * Setting rows). Facebook/GitHub/Twitter credentials were saved to the DB
 * but never consumed — users couldn't actually log in with those providers.
 *
 * The providers list is now built at request time by getConfiguredProviders()
 * which reads ALL `oauth:*` Setting rows (plus the legacy env vars) and
 * registers the corresponding NextAuth provider for each configured one.
 * The authOptions object is rebuilt on each request to pick up admin
 * credential changes without a server restart.
 */
const providers: Provider[] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      totp: { label: "2FA Code", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      const email = credentials.email.toLowerCase();

      // ── Brute-force protection: check if account is locked (Redis-backed) ──
      const lockKey = email;
      const { locked, lockedUntil } = await isAccountLocked(lockKey);
      if (locked) {
        const minsLeft = Math.ceil(((lockedUntil ?? 0) - Date.now()) / 60000);
        throw new Error(`Account temporarily locked. Try again in ${minsLeft} minute(s).`);
      }

      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        await trackFailedAttempt(lockKey);
        throw new Error("Invalid credentials");
      }

      if (user.status !== "active") {
        throw new Error("Account suspended. Contact support.");
      }

      const valid = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );
      if (!valid) {
        await trackFailedAttempt(lockKey);
        throw new Error("Invalid credentials");
      }

      // ── 2FA enforcement ──
      // If the user has 2FA enabled, the TOTP code MUST be provided and valid.
      // The frontend sends a special error message so it can show the 2FA input.
      const twoFactorSetting = await db.setting.findUnique({
        where: { key: `2fa:${user.id}` },
      });

      if (twoFactorSetting) {
        // 2FA is enabled — require a valid TOTP token
        if (!credentials.totp) {
          // Signal to the frontend that 2FA is required
          throw new Error("2FA_REQUIRED");
        }

        try {
          const { secret: encryptedSecret } = JSON.parse(twoFactorSetting.value);
          const secret = decrypt2FASecret(encryptedSecret);
          if (!secret || !(await verify2FAToken(credentials.totp, secret))) {
            await trackFailedAttempt(lockKey);
            throw new Error("Invalid 2FA code");
          }
        } catch (e: any) {
          if (e.message === "2FA_REQUIRED") throw e;
          if (e.message === "Invalid 2FA code") throw e;
          // Decryption/parsing failure — treat as 2FA failure
          await trackFailedAttempt(lockKey);
          throw new Error("2FA verification failed. Contact support.");
        }
      }

      // Reset failed attempts on successful login (Redis-backed)
      await clearFailedAttempts(lockKey);

      // Audit log
      await audit(user.id, "login", "user", user.id);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        username: user.username,
      } as any;
    },
  }),
  // ── Impersonation provider ──
  // Allows an admin to "login as" another user to reproduce issues.
  // The admin authenticates with their own email+password; the provider
  // validates the admin AND the target user, then returns a user object
  // that contains BOTH identities. The jwt callback preserves realAdminId/
  // realAdminEmail/realAdminName so the admin can later return to their
  // own account via /api/admin/impersonate/stop.
  //
  // SECURITY:
  // - Admin password is always required (no bypass via 2FA for impersonation)
  // - Target user must exist, be active, and NOT be an admin (safety)
  // - Audit log records the impersonation start
  CredentialsProvider({
    name: "impersonate",
    credentials: {
      adminEmail: { label: "Admin Email", type: "email" },
      adminPassword: { label: "Admin Password", type: "password" },
      targetUserId: { label: "Target User ID", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.adminEmail || !credentials?.adminPassword || !credentials?.targetUserId) {
        throw new Error("Admin email, password, and target user ID are required");
      }

      const adminEmail = credentials.adminEmail.toLowerCase();

      // ── Validate the admin ──
      const admin = await db.user.findUnique({ where: { email: adminEmail } });
      if (!admin || !admin.passwordHash) throw new Error("Invalid admin credentials");
      if (admin.role !== "admin") throw new Error("Only admins can impersonate");
      if (admin.status !== "active") throw new Error("Admin account is not active");

      const validPw = await bcrypt.compare(credentials.adminPassword, admin.passwordHash);
      if (!validPw) throw new Error("Invalid admin credentials");

      // ── Validate the target user ──
      const target = await db.user.findUnique({
        where: { id: credentials.targetUserId },
      });
      if (!target) throw new Error("Target user not found");
      if (target.status !== "active") throw new Error("Target user is not active");
      if (target.role === "admin") throw new Error("Cannot impersonate another admin");

      // ── Audit log (start) ──
      await audit(admin.id, "impersonate", "user", target.id, {
        targetEmail: target.email,
        targetName: target.name,
      });

      // Return the IMPERSONATED user's identity, plus the admin's identity
      // in realAdminId/realAdminEmail/realAdminName so the jwt callback can
      // preserve the admin context for "Return to admin".
      return {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
        username: target.username,
        realAdminId: admin.id,
        realAdminEmail: admin.email,
        realAdminName: admin.name,
      } as any;
    },
  }),
];

// ── OAuth provider configuration ──
//
// BROAD-FIX-BATCH-1: previously only Google was wired up. The admin
// social-auth panel (ADMIN-FIX-BATCH-2) lets admins configure Google +
// Facebook + GitHub + Twitter credentials. Each provider's credentials are
// stored in a Setting row keyed `oauth:<provider>` (encrypted with
// AES-256-GCM as `{ clientId, clientSecret }`). This function reads ALL
// configured providers from the DB (plus legacy env vars) and returns the
// corresponding NextAuth provider instances.
//
// allowDangerousEmailAccountLinking is INTENTIONALLY omitted (defaults to
// false) on every provider. Setting it to true would enable account
// takeover: an attacker could register an OAuth account with a victim's
// email and instantly access their existing NOVSMM account. With it false,
// NextAuth requires the email to be verified by the provider AND refuses to
// link if an account with that email already exists without matching the
// provider.

// Canonical list of supported OAuth providers. Must stay in sync with
// /api/admin/social-auth and /api/auth/social-providers.
export const SOCIAL_AUTH_PROVIDERS = [
  "google",
  "facebook",
  "github",
  "twitter",
] as const;
export type SocialAuthProvider = (typeof SOCIAL_AUTH_PROVIDERS)[number];

// Map provider → env-var pair used for legacy/boot-time config. If the env
// vars are set, the provider is considered configured regardless of the DB.
const ENV_PROVIDER_VARS: Record<
  SocialAuthProvider,
  [string, string]
> = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  facebook: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  twitter: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
};

/**
 * Get the list of OAuth providers that are configured (either via env vars
 * or via the DB Setting table). Safe to call from the client-facing
 * /api/auth/social-providers route — only returns provider IDs, never the
 * credentials themselves.
 */
export async function getConfiguredSocialProviders(): Promise<
  SocialAuthProvider[]
> {
  const configured: SocialAuthProvider[] = [];

  // 1. Check env vars for each provider (fast path — no DB hit needed)
  for (const provider of SOCIAL_AUTH_PROVIDERS) {
    const [idVar, secretVar] = ENV_PROVIDER_VARS[provider];
    if (process.env[idVar] && process.env[secretVar]) {
      configured.push(provider);
    }
  }

  // 2. Check DB Setting table for any oauth:* rows
  try {
    const settings = await db.setting.findMany({
      where: { key: { startsWith: "oauth:" } },
    });
    for (const s of settings) {
      const providerName = s.key.replace("oauth:", "") as SocialAuthProvider;
      if (
        (SOCIAL_AUTH_PROVIDERS as readonly string[]).includes(providerName) &&
        !configured.includes(providerName)
      ) {
        // Verify the row actually decrypts to valid credentials before
        // advertising the provider as configured.
        const { decryptJSON } = await import("./crypto-utils");
        const creds = decryptJSON(s.value);
        if (creds?.clientId && creds?.clientSecret) {
          configured.push(providerName);
        }
      }
    }
  } catch {
    // DB might not be available during build — ignore
  }

  return configured;
}

/**
 * Build the NextAuth Provider instances for every configured OAuth provider.
 * Called on each auth request so admin credential changes take effect
 * immediately (no server restart required).
 */
async function getConfiguredOAuthProviders(): Promise<Provider[]> {
  const configured = await getConfiguredSocialProviders();
  const oauthProviders: Provider[] = [];

  // For each configured provider, look up the credentials (env var first,
  // then DB) and instantiate the corresponding NextAuth provider.
  for (const provider of configured) {
    const [idVar, secretVar] = ENV_PROVIDER_VARS[provider];
    let clientId = process.env[idVar];
    let clientSecret = process.env[secretVar];

    // Fall back to DB-stored credentials if env vars aren't set
    if (!clientId || !clientSecret) {
      try {
        const setting = await db.setting.findUnique({
          where: { key: `oauth:${provider}` },
        });
        if (setting) {
          const { decryptJSON } = await import("./crypto-utils");
          const creds = decryptJSON(setting.value);
          if (creds?.clientId && creds?.clientSecret) {
            clientId = creds.clientId;
            clientSecret = creds.clientSecret;
          }
        }
      } catch {
        // DB might not be available — skip this provider
        continue;
      }
    }

    if (!clientId || !clientSecret) continue;

    switch (provider) {
      case "google":
        oauthProviders.push(
          GoogleProvider({ clientId, clientSecret })
        );
        break;
      case "facebook":
        oauthProviders.push(
          FacebookProvider({ clientId, clientSecret })
        );
        break;
      case "github":
        oauthProviders.push(
          GitHubProvider({ clientId, clientSecret })
        );
        break;
      case "twitter":
        oauthProviders.push(
          TwitterProvider({ clientId, clientSecret })
        );
        break;
    }
  }

  return oauthProviders;
}

/**
 * Backwards-compatible helper for any caller that still asks for the Google
 * OAuth config specifically. Returns the Google credentials from env or DB.
 */
export async function getGoogleOAuthConfig(): Promise<{
  clientId: string;
  clientSecret: string;
} | null> {
  // Check env vars first
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  // Check DB Setting table
  try {
    const setting = await db.setting.findUnique({
      where: { key: "oauth:google" },
    });
    if (setting) {
      const { decryptJSON } = await import("./crypto-utils");
      const creds = decryptJSON(setting.value);
      if (creds?.clientId && creds?.clientSecret) {
        return {
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
        };
      }
    }
  } catch {
    // DB might not be available during build — ignore
  }

  return null;
}

// Build the base authOptions (with the always-on Credentials + impersonate
// providers). The OAuth providers are injected per-request via
// `getDynamicAuthOptions()` so admin credential changes take effect without
// a restart. NextAuth's [...nextauth] route handler calls this helper.
function buildBaseAuthOptions(extraProviders: Provider[]): NextAuthOptions {
  return {
    adapter: PrismaAdapter(db),
    session: { strategy: "jwt" },
    // trustHost: true makes NextAuth derive the base URL from the request
    // (Host + X-Forwarded-Proto headers) instead of requiring NEXTAUTH_URL.
    // This is essential when behind a gateway/proxy with a different external URL.
    ...(({ trustHost: true }) as any),
    pages: {
      signIn: "/",
    },
    // ── H-1: Explicit cookie security settings ──
    // Ensures session + CSRF cookies are:
    //   - httpOnly: not accessible via JavaScript (prevents XSS cookie theft)
    //   - sameSite: 'lax' (prevents CSRF cross-site cookie submission)
    //   - secure: true in production (cookies only sent over HTTPS)
    cookies: {
      sessionToken: {
        name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
        },
      },
      csrfToken: {
        name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.csrf-token" : "next-auth.csrf-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
        },
      },
      callbackUrl: {
        name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
        },
      },
    },
    providers: [...providers, ...extraProviders],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = (user as any).id;
          token.role = (user as any).role;
          token.username = (user as any).username;
          // Preserve impersonation context from the "impersonate" provider
          if ((user as any).realAdminId) {
            token.realAdminId = (user as any).realAdminId;
            token.realAdminEmail = (user as any).realAdminEmail;
            token.realAdminName = (user as any).realAdminName;
          }
        }
        // Only refresh from DB if we have a user id
        if (token.id) {
          const userId = token.id as string;

          // ── Impersonation sessions: refresh the IMPERSONATED user's data
          // directly from DB (skip cache — the cache key is per-userId and
          // would overwrite the real admin's cache with the impersonated
          // user's data, leaking impersonation state). The realAdminId/
          // realAdminEmail/realAdminName fields are preserved across refreshes
          // because we only overwrite the user-data fields below.
          if (token.realAdminId) {
            try {
              const impersonated = await db.user.findUnique({
                where: { id: userId },
                select: {
                  id: true,
                  role: true,
                  balance: true,
                  heldBalance: true,
                  status: true,
                  currency: true,
                  language: true,
                  country: true,
                  name: true,
                  username: true,
                  email: true,
                  lifetimeEarnings: true,
                },
              });
              if (impersonated && impersonated.status === "active") {
                token.role = impersonated.role;
                token.balance = impersonated.balance;
                token.heldBalance = impersonated.heldBalance;
                token.status = impersonated.status;
                token.currency = impersonated.currency;
                token.language = impersonated.language;
                token.country = impersonated.country;
                token.name = impersonated.name;
                token.username = impersonated.username;
                token.email = impersonated.email;
                token.lifetimeEarnings = impersonated.lifetimeEarnings;
              }
            } catch {
              // DB might not be available during build — ignore
            }
            return token;
          }

          const cacheKey = `user:${userId}`;

          try {
            // ── Try Redis cache first (30s TTL) ──
            // This eliminates the DB hit on every authenticated request.
            // The cache is invalidated on balance/role/profile changes via
            // cacheInvalidate("user:{id}") in the relevant API routes.
            const cached = await cacheGet<{
              balance: number;
              heldBalance: number;
              role: string;
              status: string;
              currency: string;
              language: string;
              country: string;
              name: string | null;
              lifetimeEarnings: number;
            }>(cacheKey);

            if (cached) {
              token.balance = cached.balance;
              token.heldBalance = cached.heldBalance;
              token.role = cached.role;
              token.status = cached.status;
              token.currency = cached.currency;
              token.language = cached.language;
              token.country = cached.country;
              token.name = cached.name;
              token.lifetimeEarnings = cached.lifetimeEarnings;
            } else {
              // Cache miss — fetch from DB and cache for 30s
              const dbUser = await db.user.findUnique({
                where: { id: userId },
                select: { balance: true, heldBalance: true, role: true, status: true, currency: true, language: true, country: true, name: true, lifetimeEarnings: true },
              });
              if (dbUser) {
                token.balance = dbUser.balance;
                token.heldBalance = dbUser.heldBalance;
                token.role = dbUser.role;
                token.status = dbUser.status;
                token.currency = dbUser.currency;
                token.language = dbUser.language;
                token.country = dbUser.country;
                token.name = dbUser.name;
                token.lifetimeEarnings = dbUser.lifetimeEarnings;

                // Cache for 30 seconds — short enough that balance updates
                // are reflected quickly, long enough to eliminate the DB hit
                // on the 7 dashboard polling queries per 30s per active user.
                await cacheSet(cacheKey, dbUser, 30);
              }
            }
          } catch (e) {
            // DB might not be available during build — ignore
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = token.id;
          (session.user as any).role = token.role;
          (session.user as any).username = token.username;
          (session.user as any).balance = token.balance;
          (session.user as any).heldBalance = token.heldBalance;
          (session.user as any).status = token.status;
          (session.user as any).currency = token.currency;
          (session.user as any).language = token.language;
          (session.user as any).country = token.country;
          (session.user as any).lifetimeEarnings = token.lifetimeEarnings;
          // ── Impersonation context ──
          // Exposed so the frontend can show the "Return to admin" banner.
          // realAdminId/realAdminEmail are only present when this session is
          // an impersonation session.
          (session.user as any).impersonating = !!token.realAdminId;
          (session.user as any).realAdminId = token.realAdminId ?? null;
          (session.user as any).realAdminEmail = token.realAdminEmail ?? null;
          (session.user as any).realAdminName = token.realAdminName ?? null;
        }
        return session;
      },
    },
    events: {
      async signOut({ token }) {
        if (token?.id) {
          await audit(token.id as string, "logout", "user", token.id as string);
        }
      },
    },
  };
}

/**
 * Static auth options used at module load time.
 *
 * BROAD-FIX-BATCH-1: The OAuth providers are now resolved per-request via
 * `getDynamicAuthOptions()` so admin credential changes take effect without
 * a server restart. This static export is kept for callers that import
 * `authOptions` directly (e.g. `getServerSession(authOptions)` in API
 * routes — those routes only need the session/jwt/session callbacks, not
 * the OAuth provider list, so the static config is sufficient).
 *
 * The [...nextauth] route handler uses `getDynamicAuthOptions()` instead.
 */
export const authOptions: NextAuthOptions = buildBaseAuthOptions([]);

/**
 * Resolve the full authOptions (including any DB-configured OAuth providers)
 * at request time. Used by the [...nextauth] route handler so admin changes
 * to oauth:* settings take effect on the next request without a restart.
 */
export async function getDynamicAuthOptions(): Promise<NextAuthOptions> {
  try {
    const oauthProviders = await getConfiguredOAuthProviders();
    return buildBaseAuthOptions(oauthProviders);
  } catch {
    // If the DB is unreachable, fall back to the static config (credentials
    // + impersonate only). NextAuth will still work for password login.
    return authOptions;
  }
}

export type AppSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    username: string;
    role: string;
    balance: number;
    heldBalance: number;
    status: string;
    // Impersonation context (only set when this session is an impersonation)
    impersonating?: boolean;
    realAdminId?: string | null;
    realAdminEmail?: string | null;
    realAdminName?: string | null;
  };
};
