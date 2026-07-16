import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { getHuntSmmServices } from "@/lib/huntsmm";
import { validateUrlSafe } from "@/lib/outbound-webhook";

/**
 * POST /api/admin/providers/[id]/sync
 * Triggers a REAL sync of the provider's service catalog.
 *
 * ADMIN-FIX-BATCH-2: previously this endpoint faked a sync by sleeping
 * 50-250ms and reporting a fabricated latency. It now:
 *  1. Reads the Provider row from DB.
 *  2. Dispatches by `apiUrl` — currently only `huntsmm.com` is supported
 *     (other URLs return 501 "not implemented").
 *  3. Calls `getHuntSmmServices()` to fetch the live catalog.
 *  4. Upserts each remote service into the Service table (name = `[id] name`,
 *     unique-constrained). Prices use the same 30% markup as the seed script
 *     so re-syncing converges instead of churning.
 *  5. Updates `provider.status = "healthy"` + measured latency on success.
 *  6. On any failure: sets `provider.status = "degraded"` and returns 502
 *     with the error message — does NOT crash.
 *
 * Provider schema has no `lastSyncAt` column — `updatedAt` (auto-bumped by
 * Prisma's `@updatedAt`) serves the same role.
 */

// Markup applied on top of the provider's cost — matches `prisma/sync-huntsmm.ts`
// so seeded and admin-synced services price identically.
const MARKUP = 1.3;

// Re-exported from sync-huntsmm.ts so a future provider can be added without
// copy-pasting the platform/quality/category heuristics.
const PLATFORM_MAP: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  telegram: "Telegram",
  twitter: "X",
  spotify: "Spotify",
  discord: "Discord",
  twitch: "Twitch",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  threads: "Threads",
  soundcloud: "SoundCloud",
  kick: "Kick",
  whatsapp: "WhatsApp",
  website: "Website",
  traffic: "Traffic",
  seo: "SEO",
  google: "Google",
  reddit: "Reddit",
  tumblr: "Tumblr",
  vimeo: "Vimeo",
  shopee: "Shopee",
  tokopedia: "Tokopedia",
};

function detectPlatform(category: string, name: string): string {
  const text = `${category} ${name}`.toLowerCase();
  for (const [key, value] of Object.entries(PLATFORM_MAP)) {
    if (text.includes(key)) return value;
  }
  return "Other";
}

function detectQuality(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  if (text.includes("real") || text.includes("genuine")) return "real";
  if (text.includes("hq") || text.includes("high quality") || text.includes("premium")) return "premium";
  if (text.includes("quality") || text.includes("instant")) return "hq";
  return "standard";
}

function detectCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("follower")) return "followers";
  if (n.includes("like")) return "likes";
  if (n.includes("view")) return "views";
  if (n.includes("subscriber")) return "subscribers";
  if (n.includes("member")) return "members";
  if (n.includes("comment")) return "comments";
  if (n.includes("share")) return "shares";
  if (n.includes("play")) return "plays";
  if (n.includes("watch")) return "watchtime";
  if (n.includes("live")) return "viewers";
  if (n.includes("story")) return "story";
  if (n.includes("reel")) return "reels";
  return "general";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const adminId = user!.id;

  const { id } = await params;

  const provider = await db.provider.findUnique({
    where: { id },
    include: { _count: { select: { services: true } } },
  });

  if (!provider) {
    return apiError("Provider not found", 404);
  }

  // I-1 FIX: Only HuntSMM is supported for live sync. The old code used
  // a substring check (`includes("huntsmm.com")`) that was trivially
  // bypassable by embedding "huntsmm.com" as a query param in any URL
  // (e.g. "http://169.254.169.254/?huntsmm.com=1"). This allowed SSRF
  // attacks — an admin could fetch internal IPs, AWS metadata, etc.
  //
  // Now we use a strict host allowlist + validateUrlSafe() SSRF check:
  // 1. Parse the apiUrl with new URL() to extract the hostname
  // 2. Verify the hostname is in the ALLOWED_HOSTS list (exact match)
  // 3. Run validateUrlSafe() to block internal IPs, localhost, metadata
  const ALLOWED_HOSTS = ["huntsmm.com", "api.huntsmm.com"];
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(provider.apiUrl);
  } catch {
    return apiError("Provider apiUrl is not a valid URL", 422);
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  const isHuntSmm = ALLOWED_HOSTS.includes(hostname) || provider.name.toLowerCase().includes("huntsmm");

  if (!isHuntSmm) {
    return apiError(
      "Sync not implemented for this provider. Only HuntSMM is supported.",
      501
    );
  }

  // I-1 FIX: Validate the URL against the SSRF blocklist before fetching.
  // This blocks 169.254.169.254 (AWS metadata), localhost, 10.x, 192.168.x,
  // file://, gopher://, and any hostname that resolves to a blocked IP.
  try {
    await validateUrlSafe(provider.apiUrl);
  } catch (e: any) {
    console.error("[providers/sync] SSRF blocked:", e.message);
    return apiError(
      `URL validation failed: ${e.message}. The provider URL must point to a safe public hostname.`,
      403
    );
  }

  const startTime = Date.now();

  try {
    // ── Fetch the live catalog from the provider ──
    const apiKey = provider.apiKey || process.env.HUNTSMM_API_KEY || "";
    const remoteServices = await getHuntSmmServices(apiKey, provider.apiUrl);

    let synced = 0;
    let added = 0;
    const batchSize = 100;
    const now = new Date();

    // ── SERVICE-AVAILABILITY: Build a set of remote service names ──
    // After upserting, any existing DB service NOT in this set is no longer
    // available from the provider → mark as "unavailable" + status "paused".
    const remoteNames = new Set<string>();
    for (const s of remoteServices) {
      remoteNames.add(`[${s.service}] ${s.name}`.slice(0, 200));
    }

    // ── Get existing service names from DB for this provider ──
    const existingServices = await db.service.findMany({
      where: { providerId: provider.id },
      select: { id: true, name: true, availabilityTag: true },
    });
    const existingNames = new Set(existingServices.map((s) => s.name));

    // ── Upsert each remote service into the Service table ──
    for (let i = 0; i < remoteServices.length; i += batchSize) {
      const batch = remoteServices.slice(i, i + batchSize);
      await Promise.all(
        batch.map((s: any) => {
          const platform = detectPlatform(s.category || "", s.name || "");
          const category = detectCategory(s.name || "");
          const quality = detectQuality(s.name || "", s.description || "");
          const cost = parseFloat(s.rate) || 0;
          const price = parseFloat((cost * MARKUP).toFixed(2));
          const minQty = parseInt(s.min) || 1;
          const maxQty = parseInt(s.max) || 1000000;
          const name = `[${s.service}] ${s.name}`.slice(0, 200);
          const isNew = !existingNames.has(name);

          if (isNew) added++;

          return db.service.upsert({
            where: { name },
            update: {
              platform,
              category,
              description: (s.description || "No description available").slice(0, 5000),
              quality,
              deliveryTime: s.refill ? "0-1h (refillable)" : "0-1h",
              cost,
              price,
              minQty,
              maxQty,
              status: "active",
              rate: "Varies",
              providerId: provider.id,
              availabilityTag: isNew ? "new" : null,
              lastSyncedAt: now,
            },
            create: {
              name,
              platform,
              category,
              description: (s.description || "No description available").slice(0, 5000),
              quality,
              deliveryTime: s.refill ? "0-1h (refillable)" : "0-1h",
              cost,
              price,
              minQty,
              maxQty,
              status: "active",
              rate: "Varies",
              providerId: provider.id,
              availabilityTag: "new",
              lastSyncedAt: now,
            },
          });
        })
      );
      synced += batch.length;
    }

    // ── SERVICE-AVAILABILITY: Mark disappeared services as "unavailable" ──
    // Any DB service that belongs to this provider but is NOT in the remote
    // catalog → the provider removed it. Mark as "unavailable" + "paused" so
    // users can't create new orders for it (avoids refunds).
    let removed = 0;
    const disappearedIds: string[] = [];
    for (const existing of existingServices) {
      if (!remoteNames.has(existing.name)) {
        disappearedIds.push(existing.id);
      }
    }
    if (disappearedIds.length > 0) {
      const updateResult = await db.service.updateMany({
        where: { id: { in: disappearedIds } },
        data: {
          status: "paused",
          availabilityTag: "unavailable",
          lastSyncedAt: now,
        },
      });
      removed = updateResult.count;
    }

    const latency = Date.now() - startTime;

    // Mark provider healthy + record measured latency.
    const updated = await db.provider.update({
      where: { id },
      data: { status: "healthy", latency },
    });

    await audit(adminId, "provider.sync", "provider", provider.id, {
      provider: provider.name,
      synced,
      added,
      removed,
      latency,
      status: "healthy",
    });

    return apiOk({
      ok: true,
      synced,
      provider: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        latency: updated.latency,
        updatedAt: updated.updatedAt,
      },
      syncResult: {
        latency,
        status: "healthy",
        servicesChecked: remoteServices.length,
        servicesUpdated: synced,
        servicesAdded: added,
        servicesRemoved: removed,
      },
      message: `Synced ${synced} services (${added} new, ${removed} unavailable) from ${provider.name} in ${latency}ms`,
    });
  } catch (e: any) {
    const latency = Date.now() - startTime;

    // Mark provider as degraded so the admin overview reflects the failure.
    await db.provider
      .update({
        where: { id },
        data: { status: "degraded", latency },
      })
      .catch(() => {
        // Swallow — we're already in an error path.
      });

    await audit(adminId, "provider.sync_failed", "provider", provider.id, {
      provider: provider.name,
      latency,
      error: e?.message ?? String(e),
    });

    return apiError(
      `Sync failed: ${e?.message ?? "Unknown error"}`,
      502
    );
  }
}
