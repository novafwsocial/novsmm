import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { DEFAULT_TEMPLATES } from "@/lib/email-templates";

/**
 * GET /api/admin/email-templates/[id] — single template.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const template = await db.emailTemplate.findUnique({ where: { id } });
  if (!template) return apiError("Template not found", 404);

  return apiOk({ template });
}

/**
 * PATCH /api/admin/email-templates/[id] — update a template.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const { id } = await params;
  const existing = await db.emailTemplate.findUnique({ where: { id } });
  if (!existing) return apiError("Template not found", 404);

  const body = await req.json().catch(() => ({}));
  const { name, subject, body: tmplBody, isActive } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (subject !== undefined) updateData.subject = subject;
  if (tmplBody !== undefined) updateData.body = tmplBody;
  if (isActive !== undefined) updateData.isActive = isActive;

  const template = await db.emailTemplate.update({
    where: { id },
    data: updateData,
  });

  await audit(adminId, "update", "email_template", id, {
    key: existing.key,
    fields: Object.keys(updateData),
  });

  return apiOk({ template });
}

/**
 * DELETE /api/admin/email-templates/[id] — delete a template.
 * Default templates (defined in DEFAULT_TEMPLATES) can't be deleted — they
 * are deactivated instead (isActive=false) to preserve system behaviour.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const { id } = await params;
  const existing = await db.emailTemplate.findUnique({ where: { id } });
  if (!existing) return apiError("Template not found", 404);

  const isDefault = DEFAULT_TEMPLATES.some((t) => t.key === existing.key);

  if (isDefault) {
    // Deactivate instead of delete
    const template = await db.emailTemplate.update({
      where: { id },
      data: { isActive: false },
    });
    await audit(adminId, "deactivate", "email_template", id, { key: existing.key });
    return apiOk({ template, message: "Default template deactivated (cannot be deleted)" });
  }

  await db.emailTemplate.delete({ where: { id } });
  await audit(adminId, "delete", "email_template", id, { key: existing.key });

  return apiOk({ ok: true });
}
