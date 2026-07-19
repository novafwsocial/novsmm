import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/** GET /api/public/languages — active languages for registration/forms. */
export async function GET() {
  const languages = await db.language.findMany({
    where: { status: "active" },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, nativeName: true, flag: true },
  });
  return apiOk({ languages });
}
