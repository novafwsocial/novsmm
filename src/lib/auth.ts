import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * NextAuth configuration — credentials validated against the database
 * with bcrypt. JWT strategy for stateless sessions.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
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

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
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
          throw new Error("Invalid credentials");
        }

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
  ],
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
