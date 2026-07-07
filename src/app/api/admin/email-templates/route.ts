import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import {
  DEFAULT_TEMPLATES,
  seedEmailTemplates,
} from "@/lib/email-templates";

/**
 * GET /api/admin/email-templates — list all email templates.
 * Auto-seeds DEFAULT_TEMPLATES on first call if the table is empty.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  // Auto-seed if the table is empty (first admin visit)
  try {
    const count = await db.emailTemplate.count();
    if (count === 0) {
      await seedEmailTemplates();
    }
  } catch {
    // ignore — DB may be unavailable
  }

  const templates = await db.emailTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });

  return apiOk({ templates });
}

/**
 * POST /api/admin/email-templates — create a new custom email template.
 * Body: { key, name, subject, body, isActive? }
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json().catch(() => ({}));
  const { key, name, subject, body: tmplBody, isActive } = body;

  if (!key || !name || !subject || !tmplBody) {
    return apiError("key, name, subject, and body are required", 422);
  }

  // Validate key uniqueness
  const existing = await db.emailTemplate.findUnique({ where: { key } });
  if (existing) {
    return apiError("A template with this key already exists", 409);
  }

  const template = await db.emailTemplate.create({
    data: {
      key,
      name,
      subject,
      body: tmplBody,
      isActive: isActive ?? true,
    },
  });

  await audit(adminId, "create", "email_template", template.id, { key, name });

  return apiOk({ template }, 201);
}

/**
 * PATCH /api/admin/email-templates — bulk or single update by id.
 * Body: { id, name?, subject?, body?, isActive? }
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json().catch(() => ({}));
  const { id, name, subject, body: tmplBody, isActive } = body;

  if (!id) {
    return apiError("id is required", 422);
  }

  const existing = await db.emailTemplate.findUnique({ where: { id } });
  if (!existing) {
    return apiError("Template not found", 404);
  }

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

// Re-export so the admin UI can read the default template list for reference
export { DEFAULT_TEMPLATES };
