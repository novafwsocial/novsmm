import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { audit } from "@/lib/api-utils";
import { verify2FAToken, decrypt2FASecret } from "@/lib/two-factor";

// ── Brute-force protection: in-memory failed attempt tracking ──
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function trackFailedAttempt(key: string) {
  const existing = loginAttempts.get(key);
  const count = (existing?.count ?? 0) + 1;
  if (count >= MAX_FAILED_ATTEMPTS) {
    loginAttempts.set(key, { count, lockedUntil: Date.now() + LOCK_DURATION_MS });
  } else {
    loginAttempts.set(key, { count, lockedUntil: 0 });
  }
  // Cleanup old entries every 100 calls
  if (loginAttempts.size > 1000) {
    const now = Date.now();
    for (const [k, v] of loginAttempts) {
      if (v.lockedUntil < now && v.count === 0) loginAttempts.delete(k);
    }
  }
}

/**
 * NextAuth configuration.
 *
 * Providers:
 * - Credentials (email + password, validated against DB with bcrypt)
 * - Google OAuth (requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)
 *
 * Google is the only social login enabled on this platform.
 * The Google provider is only registered when its env vars are set,
 * so the app works in sandbox mode without them.
 */
const providers: NextAuthOptions["providers"] = [
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

      // ── Brute-force protection: track failed attempts ──
      const lockKey = `login_lock:${email}`;
      const lockData = loginAttempts.get(lockKey);
      if (lockData && lockData.lockedUntil > Date.now()) {
        const minsLeft = Math.ceil((lockData.lockedUntil - Date.now()) / 60000);
        throw new Error(`Account temporarily locked. Try again in ${minsLeft} minute(s).`);
      }

      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        trackFailedAttempt(lockKey);
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
        trackFailedAttempt(lockKey);
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
            trackFailedAttempt(lockKey);
            throw new Error("Invalid 2FA code");
          }
        } catch (e: any) {
          if (e.message === "2FA_REQUIRED") throw e;
          if (e.message === "Invalid 2FA code") throw e;
          // Decryption/parsing failure — treat as 2FA failure
          trackFailedAttempt(lockKey);
          throw new Error("2FA verification failed. Contact support.");
        }
      }

      // Reset failed attempts on successful login
      loginAttempts.delete(lockKey);

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
];

// ── Google OAuth ──
// allowDangerousEmailAccountLinking is INTENTIONALLY omitted (defaults to false).
// Setting it to true enabled account takeover: an attacker could register a Google
// account with a victim's email and instantly access their existing NOVSMM account.
// With it false, NextAuth requires the email to be verified by Google AND refuses
// to link if an account with that email already exists without matching the provider.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  // trustHost: true makes NextAuth derive the base URL from the request
  // (Host + X-Forwarded-Proto headers) instead of requiring NEXTAUTH_URL.
  // This is essential when behind a gateway/proxy with a different external URL.
  trustHost: true,
  pages: {
    signIn: "/",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      // Only refresh from DB if we have a user id
      if (token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
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
  };
};
