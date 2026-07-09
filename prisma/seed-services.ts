import { db } from "../src/lib/db";

/**
 * Augment the demo services with full description / quality / deliveryTime /
 * category metadata. Idempotent — re-running just re-applies the metadata.
 *
 * ADMIN-FIX-BATCH-1: refactored to export `seedServices()` so the main
 * `prisma/seed.ts` script can call it as part of a unified seed. Skips
 * services that don't exist in the DB yet (run after the demo services are
 * upserted). Auto-runs only when invoked directly (not when imported).
 */
export async function seedServices() {
  console.log("🌱 Updating services with full details...");

  const serviceDetails = [
    {
      name: "Instagram · Followers HQ",
      description: "High-quality Instagram followers with real-looking profiles, profile photos, and some posts. Non-drop guarantee for 90 days. Gradual delivery to look natural.",
      quality: "hq",
      deliveryTime: "0-2h",
      category: "followers",
    },
    {
      name: "Instagram · Likes",
      description: "Instant Instagram likes from real accounts. Split across multiple posts available. Refill guarantee for 30 days. Minimum 50 likes per order.",
      quality: "standard",
      deliveryTime: "0-30m",
      category: "likes",
    },
    {
      name: "Instagram · Reels Views",
      description: "High-retention views for Instagram Reels. Boost your reach and engagement. Delivered gradually over 1-6 hours for natural growth pattern.",
      quality: "standard",
      deliveryTime: "0-1h",
      category: "views",
    },
    {
      name: "TikTok · Views (1M)",
      description: "Massive TikTok views to boost your video's algorithm ranking. Helps trigger the For You Page (FYP). Delivered within 1-12 hours depending on quantity.",
      quality: "standard",
      deliveryTime: "0-6h",
      category: "views",
    },
    {
      name: "TikTok · Followers",
      description: "Real TikTok followers with active profiles. Helps grow your account organically. 90-day refill guarantee. No password required, just your username.",
      quality: "premium",
      deliveryTime: "0-3h",
      category: "followers",
    },
    {
      name: "YouTube · Watch hours",
      description: "Real YouTube watch hours to help monetize your channel. 100% safe, complies with YouTube's 4000-hour threshold. Gradual delivery over 5-15 days.",
      quality: "real",
      deliveryTime: "5-15d",
      category: "watchtime",
    },
    {
      name: "YouTube · Subscribers",
      description: "Permanent YouTube subscribers from real accounts. Helps meet the 1000-subscriber monetization threshold. Lifetime guarantee. No drop expected.",
      quality: "premium",
      deliveryTime: "1-5d",
      category: "subscribers",
    },
    {
      name: "Spotify · Plays",
      description: "Royalty-eligible Spotify plays from real listeners. Distributed across organic playlists. Helps boost your monthly listener count. 100% safe for your account.",
      quality: "real",
      deliveryTime: "1-7d",
      category: "plays",
    },
    {
      name: "Telegram · Members",
      description: "Real Telegram channel members. Boost your channel's credibility and reach. Members stay for 30+ days. No admin access required, just channel link.",
      quality: "standard",
      deliveryTime: "0-6h",
      category: "members",
    },
    {
      name: "X · Followers",
      description: "Twitter/X followers from active accounts. Helps grow your social proof. 60-day refill guarantee. Delivered gradually for natural growth.",
      quality: "standard",
      deliveryTime: "0-4h",
      category: "followers",
    },
    {
      name: "Twitch · Live viewers",
      description: "Live Twitch viewers to boost your stream's visibility. Helps reach Affiliate/Partner faster. Delivered in real-time during your stream. Minimum 1 hour.",
      quality: "premium",
      deliveryTime: "0-15m",
      category: "viewers",
    },
    {
      name: "Discord · Members",
      description: "Real Discord server members to grow your community. Members have profile photos and some activity. 30-day stay guarantee. Online members available.",
      quality: "standard",
      deliveryTime: "0-8h",
      category: "members",
    },
  ];

  for (const s of serviceDetails) {
    await db.service.update({
      where: { name: s.name },
      data: {
        description: s.description,
        quality: s.quality,
        deliveryTime: s.deliveryTime,
        category: s.category,
      },
    });
    console.log(`  ✓ Updated: ${s.name}`);
  }

  console.log("✅ Service details updated!");
}

// Auto-run only when invoked directly (not when imported by seed.ts).
const isMainModule = process.argv[1]?.includes("seed-services");
if (isMainModule) {
  seedServices()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
