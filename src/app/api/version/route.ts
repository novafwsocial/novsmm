import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/version — public endpoint returning the current platform version
 * and the latest changelog announcement.
 *
 * Used by the version banner shown to all users (landing + dashboard).
 */
export async function GET() {
  // Read version from Setting table (defaults to 1.0.0)
  const versionSetting = await db.setting.findUnique({ where: { key: "platform.version" } });
  const version = versionSetting?.value ?? "1.0.0";

  // Read the latest changelog entry
  const changelogSetting = await db.setting.findUnique({ where: { key: "platform.changelog" } });
  let changelog: any[] = [];
  if (changelogSetting?.value) {
    try {
      changelog = JSON.parse(changelogSetting.value);
    } catch {
      changelog = [];
    }
  }

  // Read announcement (if any — shown as a dismissible banner)
  const announcementSetting = await db.setting.findUnique({ where: { key: "platform.announcement" } });
  let announcement = null;
  if (announcementSetting?.value) {
    try {
      announcement = JSON.parse(announcementSetting.value);
    } catch {
      announcement = null;
    }
  }

  return apiOk({
    version,
    changelog: changelog.slice(0, 10), // latest 10 entries
    announcement, // { title, message, type, date } or null
  });
}
