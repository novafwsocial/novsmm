import { db } from "../src/lib/db";

const HUNTSMM_API_URL = "https://huntsmm.com/api/v2";
const HUNTSMM_API_KEY = process.env.HUNTSMM_API_KEY || "";

// Categories → platform mapping
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

async function main() {
  console.log("🔄 Syncing with HuntSMM provider...");

  // 1. Delete old providers and services
  console.log("  🗑️  Removing old providers and services...");
  await db.service.deleteMany({});
  await db.provider.deleteMany({});
  console.log("  ✓ Old data cleared");

  // 2. Create the HuntSMM provider
  const provider = await db.provider.create({
    data: {
      name: "HuntSMM",
      apiUrl: HUNTSMM_API_URL,
      apiKey: HUNTSMM_API_KEY,
      status: "healthy",
      latency: 0,
    },
  });
  console.log(`  ✓ Provider created: HuntSMM (${provider.id})`);

  // 3. Fetch services from HuntSMM API
  console.log("  📡 Fetching services from HuntSMM API...");
  const res = await fetch(HUNTSMM_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `key=${HUNTSMM_API_KEY}&action=services`,
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status}`);
  }

  const services: any[] = await res.json();
  console.log(`  ✓ Received ${services.length} services from HuntSMM`);

  // 4. Process and import services
  // The rate from HuntSMM is per 1000 units in USD.
  // Markup is kept LOW to stay competitive — adjust MARKUP below to change.
  // 30% markup = price is 1.3× the provider cost.
  // 50% markup = price is 1.5× the provider cost.
  // 100% markup = price is 2× the provider cost.
  const MARKUP = 2.5; // 150% markup — price = cost × 2.5

  let imported = 0;
  const batchSize = 100;

  for (let i = 0; i < services.length; i += batchSize) {
    const batch = services.slice(i, i + batchSize);
    const creates = batch.map((s: any) => {
      const platform = detectPlatform(s.category || "", s.name || "");
      const category = detectCategory(s.name || "");
      const quality = detectQuality(s.name || "", s.description || "");
      const cost = parseFloat(s.rate) || 0;
      const price = parseFloat((cost * MARKUP).toFixed(2));
      const minQty = parseInt(s.min) || 1;
      const maxQty = parseInt(s.max) || 1000000;

      return db.service.create({
        data: {
          name: `[${s.service}] ${s.name}`.slice(0, 200),
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
        },
      });
    });

    await db.$transaction(creates);
    imported += batch.length;
    process.stdout.write(`\r  ✓ Imported ${imported}/${services.length} services`);
  }

  console.log("\n\n✅ Sync complete!");
  console.log(`  Provider: HuntSMM`);
  console.log(`  Services imported: ${imported}`);
  console.log(`  Markup applied: 150%`);

  // 5. Verify
  const count = await db.service.count();
  const platforms = await db.service.groupBy({
    by: ["platform"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log(`\n  Services by platform:`);
  platforms.forEach((p) => {
    console.log(`    ${p.platform}: ${p._count.id}`);
  });
}

main()
  .catch((e) => {
    console.error("Sync failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
