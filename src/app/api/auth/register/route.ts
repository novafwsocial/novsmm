import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { apiError, apiOk, getBaseUrl, audit } from "@/lib/api-utils";
import { createNotification, sendEmail } from "@/lib/notify";
import { sanitizeText } from "@/lib/sanitize";

/**
 * POST /api/auth/register
 * Creates a new user account with bcrypt-hashed password.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 422);
  }

  try {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Invalid input",
        422
      );
    }

    const { name, username, email, password, country, currency, language, referralCode } =
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

    // ── ASVS V11.6.1: Anti self-referral check ──
    // Block users from referring themselves with a different email.
    // Checks: (1) referrer's email != new user's email
    //         (2) referrer's email domain != new user's email domain (catches +aliases)
    //         (3) referrer's last IP != current request IP (catches same-device abuse)
    let referrerId: string | null = null;
    if (referralCode) {
      // Look up the referral code + the referrer's email in two steps
      // (Referral model doesn't have an explicit relation to User via 'referrer')
      const referralRecord = await db.referral.findFirst({
        where: { code: referralCode },
        select: { referrerId: true },
      });
      if (referralRecord) {
        const referrerUser = await db.user.findUnique({
          where: { id: referralRecord.referrerId },
          select: { email: true },
        });
        if (referrerUser) {
          const newEmail = email.toLowerCase();
          const newDomain = newEmail.split("@")[1] ?? "";
          const referrerDomain = referrerUser.email.split("@")[1] ?? "";

          // Get client IP
          const clientIp =
            req.headers.get("x-client-ip") ||
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "unknown";

          // Get referrer's last known IP from audit logs (best-effort)
          const referrerLastIp = await db.auditLog.findFirst({
            where: { userId: referralRecord.referrerId },
            orderBy: { createdAt: "desc" },
            select: { ip: true },
          });

          const sameEmail = referrerUser.email === newEmail;
          const sameDomain = referrerDomain === newDomain && newDomain !== "";
          const sameIp =
            referrerLastIp?.ip && referrerLastIp.ip !== "unknown" &&
            referrerLastIp.ip === clientIp && clientIp !== "unknown";

          if (sameEmail) {
            // Can't refer yourself — silently ignore referral
            referrerId = null;
          } else if (sameDomain && sameIp) {
            // Same email domain + same IP — likely self-referral with alias
            referrerId = null;
          } else {
            // Valid referral — will be attributed after user creation
            referrerId = referralRecord.referrerId;
          }
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name: sanitizeText(name),
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

    // Generate email verification token
    // SECURITY (OWASP A02-3, P2): store the SHA-256 HASH of the token in
    // the DB, not the plaintext. The plaintext is only sent via email.
    const crypto = await import("crypto");
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenHash = crypto
      .createHash("sha256")
      .update(verifyToken, "utf8")
      .digest("hex");
    await db.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: verifyTokenHash,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    // Send verification email
    const baseUrl = await getBaseUrl();
    const verifyUrl = `${baseUrl}/?verify=${verifyToken}`;
    await sendEmail({
      to: email.toLowerCase(),
      subject: "Verify your NOVSMM email",
      text: `Hi ${name}!\n\nPlease verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— NOVSMM Team`,
    }).catch((e) => console.error("[register] verification email error:", e));

    // Audit log
    await audit(user.id, "create", "user", user.id, { email, username, role: "reseller" });

    // ── ASVS V11.6.1: Attribute referral (if valid, non-self-referral) ──
    const validReferrerId: string | null = referrerId;
    if (validReferrerId) {
      // Generate a unique tracking code for this referral attribution record
      const crypto = await import("crypto");
      const attributionCode = `ATTR-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      await db.referral.create({
        data: {
          referrerId: validReferrerId,
          referredId: user.id,
          referredEmail: email.toLowerCase(),
          code: attributionCode,
          status: "pending", // becomes "rewarded" when referred user makes first order
        },
      }).catch((e) => console.error("[register] referral attribution error:", e));
    }

    return apiOk({ user, message: "Account created successfully" }, 201);
  } catch (e: any) {
    console.error("[register] error:", e);
    return apiError("Registration failed. Please try again.", 500);
  }
}
