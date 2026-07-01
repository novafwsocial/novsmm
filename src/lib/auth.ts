import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

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
 * - Discord OAuth (requires DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET)
 *
 * OAuth providers are only registered when their env vars are set,
 * so the app works in sandbox mode without them.
 */
const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
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

      // Reset failed attempts on successful login
      loginAttempts.delete(lockKey);

      // Audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "login",
          entity: "user",
          entityId: user.id,
        },
      });

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
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

// ── Discord OAuth ──
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  providers.push(
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
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
        await db.auditLog.create({
          data: {
            userId: token.id as string,
            action: "logout",
            entity: "user",
            entityId: token.id as string,
          },
        });
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
