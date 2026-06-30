import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/auth/register
 * Creates a new user account with bcrypt-hashed password.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.errors[0]?.message ?? "Invalid input",
        422
      );
    }

    const { name, username, email, password, country, currency, language } =
      parsed.data;

    // Check for existing email / username
    const existing = await db.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { username }],
      },
    });
    if (existing) {
      if (existing.email === email.toLowerCase()) {
        return apiError("An account with this email already exists", 409);
      }
      return apiError("Username already taken", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        username,
        email: email.toLowerCase(),
        passwordHash,
        country,
        currency,
        language,
        role: "reseller",
        status: "active",
        balance: 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
      },
    });

    // Welcome notification
    await createNotification({
      userId: user.id,
      type: "system",
      title: "Welcome to NOVSMM 🎉",
      message: `Hi ${name}! Your workspace is ready. Top up your wallet to place your first order.`,
      severity: "success",
      sendEmail: true,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "create",
        entity: "user",
        entityId: user.id,
        metadata: JSON.stringify({ email, username, role: "reseller" }),
      },
    });

    return apiOk({ user, message: "Account created successfully" }, 201);
  } catch (e: any) {
    console.error("[register] error:", e);
    return apiError("Registration failed. Please try again.", 500);
  }
}
