import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {
  console.log("🌱 Seeding NOVSMM database...");

  // ── Admin user ──
  // Generate a random admin password on each fresh seed (NOT a hardcoded default).
  // The password is printed ONCE to stdout so the operator can capture it, then
  // must be changed on first login. Never hardcode production credentials.
  const adminPasswordPlain = crypto.randomBytes(12).toString("base64url").slice(0, 16);
  const adminPassword = await bcrypt.hash(adminPasswordPlain, 12);
  const admin = await db.user.upsert({
    where: { email: "admin@novsmm.io" },
    update: {},
    create: {
      email: "admin@novsmm.io",
      username: "admin",
      name: "NOVSMM Admin",
      passwordHash: adminPassword,
      role: "admin",
      country: "United States",
      currency: "USD",
      language: "English",
      balance: 50000,
      status: "active",
    },
  });
  console.log(`  ✓ Admin: ${admin.email}`);
  console.log(`    ⚠️  Generated admin password (CHANGE ON FIRST LOGIN): ${adminPasswordPlain}`);

  // ── Demo user ──
  const userPasswordPlain = crypto.randomBytes(12).toString("base64url").slice(0, 16);
  const userPassword = await bcrypt.hash(userPasswordPlain, 12);
  const user = await db.user.upsert({
    where: { email: "daniela@pulsemedia.io" },
    update: {},
    create: {
      email: "daniela@pulsemedia.io",
      username: "daniela",
      name: "Daniela Ríos",
      passwordHash: userPassword,
      role: "reseller",
      country: "Mexico",
      currency: "USD",
      language: "English",
      balance: 8420.5,
      heldBalance: 1280.25,
      lifetimeEarnings: 92480.5,
      status: "active",
    },
  });
  console.log(`  ✓ User: ${user.email}`);
  console.log(`    ⚠️  Generated demo password: ${userPasswordPlain}`);

  // ── Providers ──
  const providers = await Promise.all(
    [
      { name: "Provider-01", apiUrl: "https://smmapi.io/v2", status: "healthy", latency: 142 },
      { name: "Provider-02", apiUrl: "https://boostpanel.dev/api", status: "healthy", latency: 98 },
      { name: "Provider-03", apiUrl: "https://justsmm.net/api", status: "degraded", latency: 240 },
      { name: "Provider-04", apiUrl: "https://royalpanel.com/api", status: "healthy", latency: 88 },
    ].map((p) =>
      db.provider.upsert({
        where: { name: p.name },
        update: {},
        create: p,
      })
    )
  );
  console.log(`  ✓ ${providers.length} providers`);

  // ── Services ──
  const services = [
    { name: "Instagram · Followers HQ", platform: "Instagram", cost: 0.84, price: 2.4, minQty: 50, maxQty: 100000, rate: "1.2K/d", providerIdx: 3 },
    { name: "Instagram · Likes", platform: "Instagram", cost: 1.4, price: 3.6, minQty: 50, maxQty: 50000, rate: "2.4K/d", providerIdx: 3 },
    { name: "Instagram · Reels Views", platform: "Instagram", cost: 2.8, price: 6.9, minQty: 100, maxQty: 1000000, rate: "5.1K/d", providerIdx: 1 },
    { name: "TikTok · Views (1M)", platform: "TikTok", cost: 3.2, price: 7.8, minQty: 100, maxQty: 5000000, rate: "3.4K/d", providerIdx: 1 },
    { name: "TikTok · Followers", platform: "TikTok", cost: 4.5, price: 10.5, minQty: 50, maxQty: 100000, rate: "880/d", providerIdx: 0 },
    { name: "YouTube · Watch hours", platform: "YouTube", cost: 11.0, price: 24.0, minQty: 1000, maxQty: 50000, rate: "420/d", providerIdx: 2 },
    { name: "YouTube · Subscribers", platform: "YouTube", cost: 8.5, price: 18.0, minQty: 50, maxQty: 10000, rate: "340/d", providerIdx: 2 },
    { name: "Spotify · Plays", platform: "Spotify", cost: 6.5, price: 14.9, minQty: 500, maxQty: 500000, rate: "820/d", providerIdx: 2 },
    { name: "Telegram · Members", platform: "Telegram", cost: 9.0, price: 19.5, minQty: 100, maxQty: 20000, rate: "260/d", providerIdx: 0 },
    { name: "X · Followers", platform: "X", cost: 4.2, price: 9.8, minQty: 50, maxQty: 50000, rate: "198/d", providerIdx: 1 },
    { name: "Twitch · Live viewers", platform: "Twitch", cost: 2.1, price: 5.4, minQty: 50, maxQty: 5000, rate: "120/d", providerIdx: 3 },
    { name: "Discord · Members", platform: "Discord", cost: 3.8, price: 8.4, minQty: 50, maxQty: 20000, rate: "180/d", providerIdx: 0 },
  ];
  for (const s of services) {
    const { providerIdx, ...rest } = s;
    await db.service.upsert({
      where: { name: s.name },
      update: {},
      create: {
        ...rest,
        provider: { connect: { id: providers[providerIdx].id } },
      },
    });
  }
  console.log(`  ✓ ${services.length} services`);

  // ── Payment methods ──
  const paymentMethods = [
    { name: "Stripe", glyph: "S", tone: "from-violet-500/15 to-violet-500/5 text-violet-700", settleTime: "Instant", fee: "2.9% + $0.30", currencies: "USD, EUR, GBP, +135", sortOrder: 1 },
    { name: "PayPal", glyph: "P", tone: "from-blue-500/15 to-blue-500/5 text-blue-700", settleTime: "Instant", fee: "3.49% + $0.49", currencies: "USD, EUR, GBP, +25", sortOrder: 2 },
    { name: "Mercado Pago", glyph: "M", tone: "from-cyan-500/15 to-cyan-500/5 text-cyan-700", settleTime: "Instant", fee: "3.99%", currencies: "BRL, MXN, ARS, +6", sortOrder: 3 },
    { name: "Aurora Pay", glyph: "A", tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700", settleTime: "~5 min", fee: "1.5%", currencies: "USD, EUR, INR", sortOrder: 4 },
    { name: "Crypto", glyph: "₿", tone: "from-amber-500/15 to-amber-500/5 text-amber-700", settleTime: "~3 min", fee: "0% · no chargebacks", currencies: "BTC, ETH, USDT, USDC", sortOrder: 5 },
    { name: "Bank transfer", glyph: "W", tone: "from-rose-500/15 to-rose-500/5 text-rose-700", settleTime: "T+1", fee: "$0.50 fixed", currencies: "Local rails · 53", sortOrder: 6 },
  ];
  for (const pm of paymentMethods) {
    await db.paymentMethod.upsert({
      where: { name: pm.name },
      update: {},
      create: pm,
    });
  }
  console.log(`  ✓ ${paymentMethods.length} payment methods`);

  // ── Sample orders for demo user ──
  const existingOrders = await db.order.count({ where: { userId: user.id } });
  if (existingOrders === 0) {
    const svc = await db.service.findMany({ take: 5 });
    const orderData = [
      { serviceId: svc[0]?.id, serviceName: svc[0]?.name ?? "", platform: "Instagram", quantity: 1000, flag: "🇲🇽", status: "in_progress", progress: 64, eta: "2m" },
      { serviceId: svc[3]?.id, serviceName: svc[3]?.name ?? "", platform: "TikTok", quantity: 1000000, flag: "🇧🇷", status: "processing", progress: 8, eta: "5m" },
      { serviceId: svc[5]?.id, serviceName: svc[5]?.name ?? "", platform: "YouTube", quantity: 4000, flag: "🇺🇸", status: "completed", progress: 100, eta: "—" },
      { serviceId: svc[7]?.id, serviceName: svc[7]?.name ?? "", platform: "Spotify", quantity: 5000, flag: "🇪🇸", status: "completed", progress: 100, eta: "—" },
      { serviceId: svc[8]?.id, serviceName: svc[8]?.name ?? "", platform: "Telegram", quantity: 500, flag: "🇮🇳", status: "partial", progress: 72, eta: "8m" },
    ];
    let orderCounter = 10432;
    for (const o of orderData) {
      const service = await db.service.findUnique({ where: { id: o.serviceId } });
      if (!service) continue;
      const totalCost = service.cost * (o.quantity / 1000);
      const totalPrice = service.price * (o.quantity / 1000);
      await db.order.create({
        data: {
          publicId: `A-${orderCounter++}`,
          userId: user.id,
          serviceId: service.id,
          serviceName: service.name,
          platform: service.platform,
          quantity: o.quantity,
          unitCost: service.cost,
          unitPrice: service.price,
          totalCost,
          totalPrice,
          profit: totalPrice - totalCost,
          status: o.status,
          progress: o.progress,
          eta: o.eta,
          flag: o.flag,
          completedAt: o.status === "completed" ? new Date() : null,
        },
      });
    }
    console.log(`  ✓ ${orderData.length} sample orders`);
  }

  // ── Sample transactions ──
  const existingTxns = await db.transaction.count({ where: { userId: user.id } });
  if (existingTxns === 0) {
    const txnData = [
      { type: "topup", amount: 500, description: "Top-up via Stripe •••• 4242", method: "stripe", reference: "pi_3OkL2m" },
      { type: "sale", amount: 2.4, description: "Order #A-10432 — Instagram Followers", method: "balance", reference: "A-10432" },
      { type: "withdrawal", amount: -1200, description: "Withdrawal to Wise · EUR", method: "wise", reference: "wse_8841" },
      { type: "sale", amount: 24.0, description: "Order #A-10430 — YouTube Watch hours", method: "balance", reference: "A-10430" },
      { type: "referral", amount: 5.0, description: "Referral bonus · @marcus", method: "balance" },
    ];
    let txnCounter = 8842;
    for (const t of txnData) {
      await db.transaction.create({
        data: {
          publicId: `TX-${txnCounter--}`,
          userId: user.id,
          ...t,
        },
      });
    }
    console.log(`  ✓ ${txnData.length} sample transactions`);
  }

  // ── Sample notifications ──
  const existingNotifs = await db.notification.count({ where: { userId: user.id } });
  if (existingNotifs === 0) {
    const notifData = [
      { type: "system", title: "All systems operational", message: "All NOVSMM infrastructure is running nominally.", severity: "info" },
      { type: "order", title: "Order #A-10428 started", message: "Telegram · Members — provider confirmed.", amount: 19.5, severity: "info" },
      { type: "sale", title: "Sale completed", message: "Instagram · Followers HQ — $2.40 credited.", amount: 2.4, severity: "success" },
    ];
    for (const n of notifData) {
      await db.notification.create({ data: { userId: user.id, ...n } });
    }
    console.log(`  ✓ ${notifData.length} sample notifications`);
  }

  // ── Sample tickets ──
  const existingTickets = await db.ticket.count({ where: { userId: user.id } });
  if (existingTickets === 0) {
    const t1 = await db.ticket.create({
      data: {
        publicId: "T-201",
        userId: user.id,
        subject: "Order started but no delivery",
        status: "open",
        priority: "high",
        messages: {
          create: [
            { sender: "user", text: "Order #A-10428 started but I don't see members joining yet." },
            { sender: "support", text: "Hi Daniela! Checking with the provider now — should resolve in 10 min." },
          ],
        },
      },
    });
    await db.ticket.create({
      data: {
        publicId: "T-198",
        userId: user.id,
        subject: "Crypto top-up not reflected",
        status: "waiting",
        priority: "medium",
        messages: {
          create: [
            { sender: "user", text: "Sent 0.0042 BTC ~30 min ago, not reflected yet. TX: 1a2b3c…" },
            { sender: "support", text: "Got it — we'll verify on the next block confirmation." },
          ],
        },
      },
    });
    console.log(`  ✓ 2 sample tickets`);
  }

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Credentials (generated fresh this run — see above for actual values):");
  console.log("  Admin: admin@novsmm.io / <see generated password above>");
  console.log("  User:  daniela@pulsemedia.io / <see generated password above>");
  console.log("\n⚠️  Change the admin password immediately after first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
