import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { z } from "zod";

/**
 * PATCH /api/me — update the current user's profile.
 * Supports: name, country, currency, language
 * The currency change triggers re-pricing in the user's preferred currency.
 */
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  country: z.string().optional(),
  currency: z.string().optional(), // currency code: USD, MXN, EUR...
  language: z.string().optional(), // language code: en, es, pt...
});

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Invalid input", 422);
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

    if (Object.keys(updateData).length === 0) {
      return apiError("No fields to update", 422);
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
