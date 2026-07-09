import { db } from "../src/lib/db";

/**
 * Seed currencies, languages, and platform settings.
 *
 * ADMIN-FIX-BATCH-1: refactored to export `seedSettings()` so the main
 * `prisma/seed.ts` script can call it as part of a unified seed. The
 * function is idempotent — re-running upserts without overwriting existing
 * rows. Auto-runs only when invoked directly (not when imported).
 */
export async function seedSettings() {
  console.log("🌱 Seeding currencies, languages, and settings...");

  // ── Currencies ──
  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0, sortOrder: 1 },
    { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, sortOrder: 2 },
    { code: "MXN", name: "Mexican Peso", symbol: "$", rate: 17.2, sortOrder: 3 },
    { code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 5.05, sortOrder: 4 },
    { code: "ARS", name: "Argentine Peso", symbol: "$", rate: 880, sortOrder: 5 },
    { code: "COP", name: "Colombian Peso", symbol: "$", rate: 4100, sortOrder: 6 },
    { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79, sortOrder: 7 },
    { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.5, sortOrder: 8 },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 150, sortOrder: 9 },
  ];
  for (const c of currencies) {
    await db.currency.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log(`  ✓ ${currencies.length} currencies`);

  // ── Languages ──
  // ADMIN-FIX-BATCH-2: German ("de") was removed from the seed because the
  // i18n pack in src/lib/i18n.ts has zero German translations (well below the
  // 80% threshold). Shipping a language row with no UI strings would force
  // every label to fall back to English — confusing for end users who pick
  // "Deutsch" from the language selector. Re-adding German requires shipping
  // a complete `de` translation object first.
  const languages = [
    { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", sortOrder: 1 },
    { code: "es", name: "Spanish", nativeName: "Español", flag: "🇲🇽", sortOrder: 2 },
    { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷", sortOrder: 3 },
    { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", sortOrder: 4 },
  ];
  for (const l of languages) {
    await db.language.upsert({
      where: { code: l.code },
      update: {},
      create: l,
    });
  }
  // Cleanup: drop any previously-seeded German row so re-seeding converges
  // to the 4 supported languages.
  await db.language.deleteMany({ where: { code: "de" } });
  console.log(`  ✓ ${languages.length} languages (German removed — no i18n pack)`);

  // ── Settings ──
  const settings = [
    { key: "platform.name", value: "NOVSMM" },
    { key: "platform.whatsapp", value: "5215512345678" }, // WhatsApp number for live chat
    { key: "platform.supportEmail", value: "support@novsmm.io" },
    { key: "fees.marketplace", value: "0.03" }, // 3% marketplace fee
    { key: "fees.withdrawal", value: "0.01" }, // 1% withdrawal fee
    { key: "limits.minTopup", value: "10" },
    { key: "limits.maxTopup", value: "50000" },
    { key: "limits.minWithdrawal", value: "50" },
    { key: "security.rateLimitPerMinute", value: "60" },
  ];
  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`  ✓ ${settings.length} settings`);

  console.log("✅ Settings seed complete!");
}

// Auto-run only when invoked directly (not when imported by seed.ts).
const isMainModule = process.argv[1]?.includes("seed-settings");
if (isMainModule) {
  seedSettings()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
