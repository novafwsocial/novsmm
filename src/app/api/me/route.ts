import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { z } from "zod";

/**
 * GET /api/me — current user's profile, 2FA status, and notification preferences.
 * Read by the dashboard-profile Security/Notifications/Sessions sections.
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      country: true,
      currency: true,
      language: true,
      balance: true,
      heldBalance: true,
      lifetimeEarnings: true,
      status: true,
      image: true,
      createdAt: true,
    },
  });

  if (!user) return apiError("User not found", 404);

  // 2FA state lives in the Setting table (key: `2fa:${userId}`)
  const twoFactorSetting = await db.setting.findUnique({
    where: { key: `2fa:${userId}` },
  });
  const twoFactorEnabled = !!twoFactorSetting;

  // Notification preferences live in the Setting table (key: `notif_prefs:${userId}`)
  const notifPrefsSetting = await db.setting.findUnique({
    where: { key: `notif_prefs:${userId}` },
  });
  let notificationPreferences: Record<string, boolean> = {
    email: true,
    push: true,
    orders: true,
    wallet: true,
    security: true,
    marketing: false,
  };
  if (notifPrefsSetting) {
    try {
      notificationPreferences = {
        ...notificationPreferences,
        ...JSON.parse(notifPrefsSetting.value),
      };
    } catch {
      // ignore parse errors — keep defaults
    }
  }

  return apiOk({
    user: {
      ...user,
      twoFactorEnabled,
      notificationPreferences,
    },
  });
}

/**
 * PATCH /api/me — update the current user's profile.
 * Supports: name, country, currency, language, role, notificationPreferences
 */
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  country: z.string().optional(),
  currency: z.string().optional(), // currency code: USD, MXN, EUR...
  language: z.string().optional(), // language code: en, es, pt...
  role: z.enum(["reseller", "agency", "creator", "enterprise"]).optional(),
  notificationPreferences: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      orders: z.boolean().optional(),
      wallet: z.boolean().optional(),
      security: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const currentRole = (session!.user as any).role;

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.country !== undefined) updateData.country = parsed.data.country;
    if (parsed.data.currency !== undefined) {
      // Validate the currency exists and is active
      const currency = await db.currency.findFirst({
        where: { code: parsed.data.currency, status: "active" },
      });
      if (!currency) {
        return apiError(`Currency ${parsed.data.currency} is not available`, 422);
      }
      updateData.currency = parsed.data.currency;
    }
    if (parsed.data.language !== undefined) {
      // Validate the language exists and is active
      const language = await db.language.findFirst({
        where: { code: parsed.data.language, status: "active" },
      });
      if (!language) {
        return apiError(`Language ${parsed.data.language} is not available`, 422);
      }
      updateData.language = parsed.data.language;
    }

    // Role updates — admins cannot self-elevate (defense in depth)
    if (parsed.data.role !== undefined) {
      if (currentRole === "admin") {
        return apiError("Admins cannot change their role", 403);
      }
      updateData.role = parsed.data.role;
    }

    // Notification preferences — stored in Setting table (not on User)
    if (parsed.data.notificationPreferences !== undefined) {
      const existingPrefs = await db.setting.findUnique({
        where: { key: `notif_prefs:${userId}` },
      });
      const currentPrefs = existingPrefs
        ? JSON.parse(existingPrefs.value || "{}")
        : {};
      const mergedPrefs = { ...currentPrefs, ...parsed.data.notificationPreferences };
      await db.setting.upsert({
        where: { key: `notif_prefs:${userId}` },
        update: { value: JSON.stringify(mergedPrefs) },
        create: { key: `notif_prefs:${userId}`, value: JSON.stringify(mergedPrefs) },
      });
    }

    if (Object.keys(updateData).length === 0) {
      return apiOk({
        user: {
          id: userId,
          role: currentRole,
        },
        message: "Profile updated successfully",
      });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        country: true,
        currency: true,
        language: true,
        balance: true,
        heldBalance: true,
        status: true,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId,
        action: "update",
        entity: "user",
        entityId: userId,
        metadata: JSON.stringify(updateData),
      },
    });

    return apiOk({ user, message: "Profile updated successfully" });
  } catch (e: any) {
    console.error("[me/update] error:", e);
    return apiError("Failed to update profile", 500);
  }
}
