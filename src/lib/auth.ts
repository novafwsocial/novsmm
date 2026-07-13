import type { NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { verify2FAToken, decrypt2FASecret, read2FAPayload } from "@/lib/two-factor";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache";
import { decryptJSON } from "@/lib/crypto-utils";

/**
 * Safely decrypt + parse a 2FA Setting payload (OWASP A08-2, P3).
 * Returns null on any failure (corrupted ciphertext, malformed JSON,
 * missing fields). The caller MUST handle null as a fail-closed case.
 *
 * SECURITY FIX (S-C-002): delegates to `read2FAPayload` (from two-factor.ts)
 * which handles BOTH the new encrypted format (write2FAPayload/encryptJSON)
 * and the legacy plain-JSON format transparently. This fixes the 2FA lockout
 * bug where setup/verify wrote plain JSON but login expected AES-encrypted.
 */
function decryptJSONSafe<T = any>(value: string | null | undefined): T | null {
  if (!value) return null;
  const payload = read2FAPayload(value);
  if (!payload) return null;
  return payload as unknown as T;
}

/**
 * Extract the client IP from the request headers (OWASP A07-3, P2).
 * Used by the brute-force lockout to track attempts per-IP in addition
 * to per-email. Falls back to "unknown" if neither x-client-ip nor
 * x-forwarded-for is set (the middleware always sets x-client-ip).
 */
async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-client-ip") ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

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
      // SECURITY (OWASP A04-3, P1): Accept a backup code as an ALTERNATIVE
      // to the TOTP. A user with a lost TOTP device can still log in by
      // supplying a one-time backup code. The code is verified against the
      // bcrypt-hashed codes stored at 2FA-setup time, and the used code is
      // rotated out (single-use).
      backupCode: { label: "Backup Code", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      const email = credentials.email.toLowerCase();

      // ── Brute-force protection: check if account is locked (Redis-backed) ──
      // SECURITY (OWASP A07-3, P2): keyed by BOTH email AND IP so that a
      // distributed brute force from many IPs against one email, AND a
      // single-IP spray against many emails, are both bounded.
      const clientIp = await getClientIp();
      const lockKeyEmail = `email:${email}`;
      const lockKeyIp = clientIp !== "unknown" ? `ip:${clientIp}` : null;

      const [emailLock, ipLock] = await Promise.all([
        isAccountLocked(lockKeyEmail),
        lockKeyIp ? isAccountLocked(lockKeyIp) : Promise.resolve({ locked: false }),
      ]);
      if (emailLock.locked || ipLock.locked) {
        // SECURITY (OWASP A07-4, P2): don't disclose whether the email exists
        // or which lock triggered — return the generic "Invalid credentials".
        throw new Error("Invalid credentials");
      }

      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        await trackFailedAttempt(lockKeyEmail);
        if (lockKeyIp) await trackFailedAttempt(lockKeyIp);
        throw new Error("Invalid credentials");
      }

      if (user.status !== "active") {
        // Don't disclose whether the email exists or why login failed.
        throw new Error("Invalid credentials");
      }

      const valid = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );
      if (!valid) {
        await trackFailedAttempt(lockKeyEmail);
        if (lockKeyIp) await trackFailedAttempt(lockKeyIp);
        throw new Error("Invalid credentials");
      }

      // ── 2FA enforcement ──
      // Flow A (recommended by the OWASP audit): the TOTP (or backup code)
      // is verified INSIDE authorize() before the session is issued. The
      // frontend re-calls signIn("credentials", {email, password, totp})
      // or signIn("credentials", {email, password, backupCode}) once the
      // user has been prompted for 2FA.
      //
      // SECURITY (OWASP A04-3, P1): the legacy `/api/auth/verify-2fa` route
      // and its `2fa:verified:${userId}` stamp are DEPRECATED — backup codes
      // now work directly in this flow.
      const twoFactorSetting = await db.setting.findUnique({
        where: { key: `2fa:${user.id}` },
      });

      if (twoFactorSetting) {
        // 2FA is enabled — require either a TOTP token OR a backup code.
        if (!credentials.totp && !credentials.backupCode) {
          // Signal to the frontend that 2FA is required
          throw new Error("2FA_REQUIRED");
        }

        // SECURITY (OWASP A08-2, P3): use decryptJSON instead of
        // JSON.parse(decrypt(...)) so a corrupted Setting row doesn't crash
        // the login flow. decryptJSON returns null on failure.
        const payload = decryptJSONSafe(twoFactorSetting.value);
        if (!payload) {
          // 2FA setup is corrupted — fail-closed. Don't lock the user out
          // of password verification, but they must contact support to fix
          // 2FA. (They can still login via OAuth if configured.)
          await trackFailedAttempt(lockKeyEmail);
          if (lockKeyIp) await trackFailedAttempt(lockKeyIp);
          throw new Error("2FA setup is corrupted. Contact support to reset 2FA.");
        }

        let twoFactorOk = false;
        let usedBackupCode = false;

        if (credentials.totp) {
          const secret = decrypt2FASecret(payload.secret);
          if (secret && (await verify2FAToken(String(credentials.totp), secret))) {
            twoFactorOk = true;
          }
        }

        // If TOTP didn't work (or wasn't provided), try the backup code.
        if (!twoFactorOk && credentials.backupCode) {
          const normalized = String(credentials.backupCode).trim().toUpperCase();
          const codes: string[] = Array.isArray(payload.backupCodes) ? payload.backupCodes : [];
          let matchedIndex = -1;
          for (let i = 0; i < codes.length; i++) {
            try {
              if (await bcrypt.compare(normalized, codes[i])) {
                matchedIndex = i;
                break;
              }
            } catch {
              // malformed hash — skip
            }
          }
          if (matchedIndex !== -1) {
            twoFactorOk = true;
            usedBackupCode = true;
            // Rotate: remove the used code so it's single-use.
            // SECURITY FIX (S-C-002): use write2FAPayload for consistent
            // encrypted format (was encryptJSON direct — worked, but
            // write2FAPayload is the canonical helper).
            const remaining = codes.filter((_, i) => i !== matchedIndex);
            try {
              const { write2FAPayload } = await import("./two-factor");
              await db.setting.update({
                where: { key: `2fa:${user.id}` },
                data: {
                  value: write2FAPayload({
                    secret: payload.secret,
                    backupCodes: remaining,
                  }),
                },
              });
            } catch {
              // best-effort — don't block login on rotation failure
            }
          }
        }

        if (!twoFactorOk) {
          await trackFailedAttempt(lockKeyEmail);
          if (lockKeyIp) await trackFailedAttempt(lockKeyIp);
          throw new Error("Invalid 2FA code");
        }

        // Optional: log backup-code usage so support can reach out to users
        // running low on backup codes.
        if (usedBackupCode) {
          try {
            await audit(user.id, "login", "user", user.id, { method: "2fa_backup_code" });
          } catch {}
        }
      }

      // Reset failed attempts on successful login (Redis-backed)
      await clearFailedAttempts(lockKeyEmail);
      if (lockKeyIp) await clearFailedAttempts(lockKeyIp);

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
  // DIAGNOSTIC LOG: helps debug "Google login redirects to landing" issues.
  console.log(`[auth] getConfiguredOAuthProviders: configured=[${configured.join(",")}]`);
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
            console.log(`[auth] ${provider}: loaded credentials from DB (clientId: ${String(clientId).slice(0, 8)}...)`);
          } else {
            console.error(`[auth] ${provider}: DB setting exists but decryption returned null — LICENSE_ENCRYPTION_KEY may have changed!`);
          }
        } else {
          console.error(`[auth] ${provider}: getConfiguredSocialProviders said it's configured but no DB row found (race condition?)`);
        }
      } catch (e) {
        console.error(`[auth] ${provider}: error reading DB credentials:`, e);
        // DB might not be available — skip this provider
        continue;
      }
    } else {
      console.log(`[auth] ${provider}: using env var credentials (clientId: ${String(clientId).slice(0, 8)}...)`);
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
    // SECURITY FIX (A-003): removed trustHost: true — it made NextAuth
    // derive the base URL from the forgeable Host header, enabling
    // host-header injection attacks (password-reset poisoning → account
    // takeover). Now NextAuth uses NEXTAUTH_URL from env (already set in
    // .env as https://novsmm.shop), which is a server-side constant that
    // cannot be spoofed by the client.
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
      async signIn({ user, account, profile }) {
        // FIX (OAuth): When a user signs in via OAuth (Google, Facebook, etc.),
        // PrismaAdapter creates the User row automatically AFTER signIn returns
        // true. We must NOT create the user here — doing so causes a unique-
        // constraint violation (P2002) when PrismaAdapter then tries to create
        // the same user, which silently kills the OAuth flow and the session
        // is never set (user gets redirected back to the landing page).
        //
        // The username generation is handled by the `events.createUser` event
        // (see below), which fires AFTER PrismaAdapter creates the user.
        //
        // FIX (OAuthAccountNotLinked): When a user with the same email already
        // exists (e.g. they registered with email+password first, then tried
        // to sign in with Google), NextAuth refuses to link the OAuth account
        // automatically → error "OAuthAccountNotLinked". This is a security
        // measure to prevent account takeover, but for our use case we WANT
        // to link them (the user owns both the email and the Google account).
        // We manually create the Account row here, linking the OAuth provider
        // to the existing user, so PrismaAdapter doesn't try to create a new
        // user and trigger the "OAuthAccountNotLinked" error.
        if (account?.provider && account.provider !== "credentials" && account.provider !== "impersonate") {
          console.log(`[auth] signIn callback: provider=${account.provider}, user.email=${user.email}, user.id=${user.id}`);
          try {
            const email = user.email?.toLowerCase();
            if (!email) {
              console.error("[auth] signIn callback: no email from OAuth provider");
              return false;
            }

            const dbUser = await db.user.findUnique({ where: { email } });
            console.log(`[auth] signIn callback: dbUser=${dbUser ? `found (id=${dbUser.id}, username=${dbUser.username})` : "not found"}`);

            if (dbUser) {
              // User already exists — check if they have an Account row for
              // this provider. If not, create one to link them (avoids
              // OAuthAccountNotLinked error).
              if (account.providerAccountId) {
                const existingAccount = await db.account.findUnique({
                  where: {
                    provider_providerAccountId: {
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                    },
                  },
                });

                if (!existingAccount) {
                  console.log(`[auth] signIn callback: linking ${account.provider} account to existing user ${dbUser.id}`);
                  await db.account.create({
                    data: {
                      userId: dbUser.id,
                      type: account.type ?? "oauth",
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                      access_token: account.access_token ?? null,
                      refresh_token: account.refresh_token ?? null,
                      expires_at: account.expires_at ?? null,
                      token_type: account.token_type ?? null,
                      scope: account.scope ?? null,
                      id_token: account.id_token ?? null,
                      session_state: (account as any).session_state ?? null,
                    },
                  });
                  console.log(`[auth] signIn callback: account linked successfully`);
                } else {
                  console.log(`[auth] signIn callback: account already linked`);
                }
              }

              // Attach the existing user's id/role/username to the user object
              // so the jwt callback uses the correct user (not a new one).
              (user as any).id = dbUser.id;
              (user as any).role = dbUser.role;
              (user as any).username = dbUser.username ?? "";

              if (!dbUser.username) {
                // Defensive fallback: user exists but has no username.
                const baseUsername = (dbUser.name || email.split("@")[0])
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 20) || "user";
                let username = baseUsername;
                let suffix = 1;
                while (await db.user.findUnique({ where: { username } })) {
                  username = `${baseUsername}${suffix++}`;
                }
                await db.user.update({
                  where: { id: dbUser.id },
                  data: { username },
                });
                (user as any).username = username;
                console.log(`[auth] signIn callback: generated username "${username}" for existing user`);
              }
            }
            // If dbUser is null, PrismaAdapter will create the user + account
            // automatically after signIn returns true. The events.createUser
            // handler will generate the username.
          } catch (e) {
            console.error("[auth] OAuth signIn error:", e);
            return false;
          }
        }
        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.id = (user as any).id;
          token.role = (user as any).role;
          // FIX (OAuth nullable username): User.username is `string | null`
          // (nullable to allow OAuth users to be created before the signIn
          // callback generates a username). Coerce to "" so the JWT/session
          // always carries a string — this keeps AuthUser.username and
          // AppSession.user.username honest as `string` rather than
          // `string | null`, and prevents null leaking to the frontend in
          // the brief window before username is generated.
          token.username = (user as any).username ?? "";
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

          // ── SECURITY (OWASP A07-1 + A04-5): JWT session invalidation ──
          // On every request we re-check `passwordChangedAt`. If the JWT
          // was issued (token.iat, seconds since epoch) BEFORE the user's
          // most-recent password change / reset / 2FA disable / account
          // self-deletion, the session is stale — return an empty token
          // which forces NextAuth to treat the session as logged-out.
          // This closes the "stolen-session-cookie persists after password
          // rotation" hole. We use a SEPARATE DB hit (not the cached user
          // object below) because the cached object can be 30s stale.
          try {
            const pwRow = await db.user.findUnique({
              where: { id: userId },
              select: { passwordChangedAt: true, status: true, updatedAt: true },
            });
            if (!pwRow) {
              // User row gone (deleted account) — kill the session.
              return {} as any;
            }
            const iat = typeof token.iat === "number" ? token.iat : 0;
            if (pwRow.passwordChangedAt && iat) {
              // token.iat is in seconds; passwordChangedAt is a Date.
              const pwTs = Math.floor(pwRow.passwordChangedAt.getTime() / 1000);
              if (iat < pwTs) {
                // Token issued before the password change — invalidate.
                return {} as any;
              }
            }
            // SECURITY (A07-1 also): if the account was suspended after
            // the session was issued, force re-auth so the user sees the
            // "suspended" login error instead of continuing silently.
            if (pwRow.status !== "active" && iat) {
              // Allow a 60s grace window so we don't lock out the user
              // mid-request during the suspension PATCH (which fires
              // notifications etc). After that, the session is killed.
              const suspendedTs = Math.floor((pwRow.updatedAt as Date)?.getTime?.() / 1000) ?? 0;
              if (suspendedTs && iat < suspendedTs - 60) {
                return {} as any;
              }
            }
          } catch {
            // DB might be unavailable during build — don't kill sessions
            // for transient DB errors (fail-open here is the lesser evil
            // vs. locking out every user during a DB blip).
          }

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
                // FIX (OAuth nullable username): coerce null → ""
                token.username = impersonated.username ?? "";
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
            // FIX (OAuth nullable username): added `username` to the cache
            // payload so it gets refreshed alongside balance/role/etc.
            const cached = await cacheGet<{
              balance: number;
              heldBalance: number;
              role: string;
              status: string;
              currency: string;
              language: string;
              country: string;
              name: string | null;
              username: string | null;
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
              token.username = cached.username ?? "";
              token.lifetimeEarnings = cached.lifetimeEarnings;
            } else {
              // Cache miss — fetch from DB and cache for 30s
              // FIX (OAuth nullable username): added `username` to the
              // select so the token picks up the username generated by
              // events.createUser (which runs after PrismaAdapter creates
              // the user but before this refresh on the first jwt call).
              const dbUser = await db.user.findUnique({
                where: { id: userId },
                select: { balance: true, heldBalance: true, role: true, status: true, currency: true, language: true, country: true, name: true, username: true, lifetimeEarnings: true },
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
                // FIX (OAuth nullable username): refresh username from DB
                // so the token picks up the username generated by
                // events.createUser (which runs after PrismaAdapter creates
                // the user). Coerce null → "" for type honesty.
                token.username = dbUser.username ?? "";
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
      // FIX (OAuth): PrismaAdapter creates the User row WITHOUT username
      // (username is `String? @unique` to allow this). This event fires
      // RIGHT AFTER PrismaAdapter creates the user, so we generate a
      // username here and update the DB. By the time the jwt callback
      // runs (which refreshes from DB), the username is already set.
      async createUser({ user }) {
        console.log(`[auth] events.createUser: user.id=${user.id}, user.email=${user.email}`);
        if (!user?.id || !user?.email) {
          console.error("[auth] events.createUser: missing user.id or user.email");
          return;
        }
        try {
          // Re-fetch to check if username is already set (defensive —
          // a prior createUser event may have already run).
          const existing = await db.user.findUnique({
            where: { id: user.id },
            select: { username: true, name: true, email: true },
          });
          if (!existing) {
            console.error(`[auth] events.createUser: user ${user.id} not found in DB (PrismaAdapter may have failed)`);
            return;
          }
          if (existing.username) {
            console.log(`[auth] events.createUser: user already has username "${existing.username}", skipping`);
            return;
          }

          const baseUsername = (existing.name || existing.email.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 20) || "user";
          let username = baseUsername;
          let suffix = 1;
          while (await db.user.findUnique({ where: { username } })) {
            username = `${baseUsername}${suffix++}`;
          }

          await db.user.update({
            where: { id: user.id },
            data: { username },
          });
          console.log(`[auth] events.createUser: generated username "${username}" for user ${user.id}`);

          await createNotification({
            userId: user.id,
            type: "system",
            title: "Welcome to NOVSMM 🎉",
            message: `Hi ${existing.name || username}! Your workspace is ready. Top up your wallet to place your first order.`,
            severity: "success",
          }).catch(() => {});

          await audit(user.id, "register", "user", user.id, {
            provider: "oauth",
            email: existing.email,
          }).catch(() => {});
        } catch (e) {
          console.error("[auth] createUser event error:", e);
          // Don't throw — the user is already created, they can still log in.
          // The signIn callback's defensive fallback will generate the
          // username on the next login attempt.
        }
      },
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
