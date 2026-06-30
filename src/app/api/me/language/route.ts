import { NextRequest } from "next/server";
import { getTranslations } from "@/lib/i18n";
import { apiOk, apiError } from "@/lib/api-utils";

/**
 * GET /api/me/language?lang=es
 * Returns all UI translations for the requested language.
 * Falls back to English for missing keys.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") ?? "en";

  const supported = ["en", "es", "pt", "fr", "de"];
  if (!supported.includes(lang)) {
    return apiError(`Language ${lang} not supported. Available: ${supported.join(", ")}`, 404);
  }

  const translations = getTranslations(lang);
  return apiOk({ lang, translations });
}
