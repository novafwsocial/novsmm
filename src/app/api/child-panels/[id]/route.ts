import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * Single child-panel endpoints.
 *
 *   GET    /api/child-panels/[id]   → fetch a single child panel (own)
 *   PATCH  /api/child-panels/[id]   → update name / markupPercent / status
 *   DELETE /api/child-panels/[id]   → cancel the child panel (soft delete)
 *
 * Ownership is enforced by querying with `{ id, userId }` and returning a
 * single 404 if the panel doesn't exist OR doesn't belong to the caller —
 * this avoids leaking panel IDs across users.
 *
 * Status transitions allowed via PATCH:
 *   active    → suspended | cancelled
 *   suspended → active | cancelled
 *   cancelled → (no transitions — cancelled is terminal)
 *
 * DELETE is sugar for PATCH { status: "cancelled" }. The row is never
 * physically deleted — we keep cancelled panels for billing history.
 */

const updateSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    markupPercent: z.number().min(0).max(100).optional(),
    status: z.enum(["active", "suspended", "cancelled"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Nothing to update",
  });

/**
 * GET /api/child-panels/[id] — fetch a single child panel.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  const { id } = await params;

  const panel = await db.childPanel.findFirst({
    where: { id, userId },
    select: {
      id: true,
      publicId: true,
      name: true,
      subdomain: true,
      plan: true,
      markupPercent: true,
      status: true,
      monthlyFee: true,
      paidUntil: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!panel) return apiError("Child panel not found", 404);

  return apiOk({ panel });
}

/**
 * PATCH /api/child-panels/[id] — update name / markupPercent / status.
 *
 * Status transition rules:
 *   active    → suspended | cancelled   ✓
 *   suspended → active | cancelled      ✓
 *   cancelled → anything                ✗ (terminal)
 *
 * Idempotent: setting the same status as current is allowed (no-op).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }
    const { name, markupPercent, status } = parsed.data;

    // ── Fetch with ownership check ──
    const existing = await db.childPanel.findFirst({
      where: { id, userId },
      select: { id: true, status: true, publicId: true, name: true },
    });
    if (!existing) return apiError("Child panel not found", 404);

    // ── Status transition validation ──
    if (status && status !== existing.status) {
      if (existing.status === "cancelled") {
        return apiError(
          "Cancelled panels cannot be reactivated. Create a new one instead.",
          422,
        );
      }
      const allowed: Record<string, string[]> = {
        active: ["suspended", "cancelled"],
        suspended: ["active", "cancelled"],
      };
      const permitted = allowed[existing.status] ?? [];
      if (!permitted.includes(status)) {
        return apiError(
          `Cannot transition from ${existing.status} to ${status}`,
          422,
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (markupPercent !== undefined) updateData.markupPercent = markupPercent;
    if (status !== undefined) updateData.status = status;

    const panel = await db.childPanel.update({
      where: { id: existing.id },
      data: updateData,
      select: {
        id: true,
        publicId: true,
        name: true,
        subdomain: true,
        plan: true,
        markupPercent: true,
        status: true,
        monthlyFee: true,
        paidUntil: true,
        updatedAt: true,
      },
    });

    await audit(userId, "update", "child_panel", existing.id, {
      publicId: existing.publicId,
      ...updateData,
    });

    // ── Notify on status changes ──
    if (status && status !== existing.status) {
      await createNotification({
        userId,
        type: "system",
        title: `Child panel ${existing.publicId} ${status}`,
        message:
          status === "cancelled"
            ? `${existing.name} has been cancelled. Your subdomain will be released shortly.`
            : `${existing.name} has been ${status}.`,
        severity: status === "cancelled" ? "warning" : "info",
        sendEmail: true,
      });
    }

    return apiOk({ panel, message: "Child panel updated" });
  } catch (e: any) {
    console.error("[child-panels/update] error:", e);
    return apiError("Failed to update child panel", 500);
  }
}

/**
 * DELETE /api/child-panels/[id] — cancel the child panel (soft delete).
 * The row is kept for billing history; status flips to "cancelled".
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  const { id } = await params;

  const existing = await db.childPanel.findFirst({
    where: { id, userId },
    select: { id: true, publicId: true, name: true, status: true },
  });
  if (!existing) return apiError("Child panel not found", 404);

  if (existing.status === "cancelled") {
    return apiOk({ message: "Already cancelled", panel: existing });
  }

  const panel = await db.childPanel.update({
    where: { id: existing.id },
    data: { status: "cancelled" },
    select: {
      id: true,
      publicId: true,
      name: true,
      status: true,
    },
  });

  await audit(userId, "cancel", "child_panel", existing.id, {
    publicId: existing.publicId,
  });

  await createNotification({
    userId,
    type: "system",
    title: `Child panel ${existing.publicId} cancelled`,
    message: `${existing.name} has been cancelled. Your subdomain will be released shortly.`,
    severity: "warning",
    sendEmail: true,
  });

  return apiOk({ panel, message: "Child panel cancelled" });
}
