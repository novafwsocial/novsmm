import { NextRequest } from "next/server";
import { getTranslations } from "@/lib/i18n";
import { requireAuth, apiOk, apiError } from "@/lib/api-utils";

/**
 * GET /api/me/language?lang=es
 * Returns all UI translations for the requested language.
 * Falls back to English for missing keys.
 *
 * Auth required: This endpoint is under /api/me/* and must not be public.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") ?? "en";

  const supported = ["en", "es", "pt", "fr", "de"];
  if (!supported.includes(lang)) {
    return apiError(`Language ${lang} not supported. Available: ${supported.join(", ")}`, 404);
  }

  const translations = getTranslations(lang);
  return apiOk({ lang, translations });
}
