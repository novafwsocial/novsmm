import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { updateLanguageSchema } from "@/lib/validations";

/** GET /api/admin/languages — list all languages. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const languages = await db.language.findMany({ orderBy: { sortOrder: "asc" } });
  return apiOk({ languages });
}

/** POST /api/admin/languages — add a language. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  if (!body.code || !body.name) {
    return apiError("Code and name are required", 422);
  }

  try {
    const language = await db.language.create({
      data: {
        code: body.code.toLowerCase(),
        name: body.name,
        nativeName: body.nativeName ?? body.name,
        flag: body.flag ?? "🌍",
        status: body.status ?? "active",
        sortOrder: body.sortOrder ?? 99,
      },
    });
    await audit(adminId, "create", "language", language.id, { code: language.code });
    return apiOk({ language, message: "Language added" }, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Language code already exists", 409);
    return apiError("Failed to add language", 500);
  }
}

/** PATCH /api/admin/languages */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = updateLanguageSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }
  const { id, ...data } = parsed.data;

  const language = await db.language.update({ where: { id }, data });
  await audit(adminId, "update", "language", id, data);
  return apiOk({ language });
}
