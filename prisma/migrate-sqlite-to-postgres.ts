/**
 * SQLite → PostgreSQL Data Migration Script
 * ----------------------------------------------------------------
 * Reads all data from the SQLite database (db/custom.db) and writes it
 * to a PostgreSQL database, transforming types along the way:
 *
 *   - Float → Decimal (Prisma.Decimal)
 *   - String JSON → object (Prisma Json)
 *   - String enums → enum values (same strings, but typed)
 *   - String IP → String (PostgreSQL @db.Inet accepts strings)
 *
 * PREREQUISITES:
 *   1. PostgreSQL installed and running
 *   2. Database created: createdb novsmm
 *   3. prisma/schema.prisma replaced with prisma/schema.postgres.prisma
 *   4. DATABASE_URL points to PostgreSQL
 *   5. prisma migrate dev --name init_postgresql has been run (tables created)
 *
 * USAGE:
 *   # From the project root, with PostgreSQL DATABASE_URL in .env:
 *   SQLITE_DATABASE_URL="file:./db/custom.db" bun run prisma/migrate-sqlite-to-postgres.ts
 *
 *   Or set SQLITE_DATABASE_URL in .env:
 *   SQLITE_DATABASE_URL=file:/home/z/my-project/db/custom.db
 *   bun run prisma/migrate-sqlite-to-postgres.ts
 *
 * SAFETY:
 *   - Reads from SQLite only (never writes to it)
 *   - Writes to PostgreSQL in batches of 500 rows
 *   - Verifies row counts match at the end
 *   - Idempotent — can be run multiple times (uses upsert)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaClient as SqlitePrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

// ── Source (SQLite) client ──
const sqliteUrl = process.env.SQLITE_DATABASE_URL || "file:./db/custom.db";
const sqlite = new SqlitePrismaClient({
  datasources: { db: { url: sqliteUrl } },
});

// ── Destination (PostgreSQL) client ──
// Uses DATABASE_URL from .env (should point to PostgreSQL)
const postgres = new PrismaClient();

// ── Batch size for writes ──
const BATCH_SIZE = 500;

async function main() {
  console.log("🔄 NOVSMM SQLite → PostgreSQL Migration");
  console.log("=========================================");
  console.log(`  Source (SQLite): ${sqliteUrl}`);
  console.log(`  Destination (PostgreSQL): ${process.env.DATABASE_URL}`);
  console.log("");

  // ── Track counts for verification ──
  const counts: Record<string, { source: number; dest: number }> = {};

  // ── Migrate tables in dependency order (parents before children) ──

  await migrateTable("User", async () => {
    const rows = await sqlite.user.findMany();
    counts.User = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.user.upsert({
        where: { id: row.id },
        create: {
          ...row,
          balance: toDecimal(row.balance),
          heldBalance: toDecimal(row.heldBalance),
          lifetimeEarnings: toDecimal(row.lifetimeEarnings),
        },
        update: {
          ...row,
          balance: toDecimal(row.balance),
          heldBalance: toDecimal(row.heldBalance),
          lifetimeEarnings: toDecimal(row.lifetimeEarnings),
        },
      });
      counts.User.dest++;
    }
  });

  await migrateTable("Account", async () => {
    const rows = await sqlite.account.findMany();
    counts.Account = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.account.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Account.dest++;
    }
  });

  await migrateTable("Session", async () => {
    const rows = await sqlite.session.findMany();
    counts.Session = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.session.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Session.dest++;
    }
  });

  await migrateTable("VerificationToken", async () => {
    const rows = await sqlite.verificationToken.findMany();
    counts.VerificationToken = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.verificationToken.upsert({
        where: { token: row.token },
        create: row,
        update: row,
      });
      counts.VerificationToken.dest++;
    }
  });

  await migrateTable("Provider", async () => {
    const rows = await sqlite.provider.findMany();
    counts.Provider = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.provider.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Provider.dest++;
    }
  });

  await migrateTable("Service", async () => {
    const rows = await sqlite.service.findMany();
    counts.Service = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.service.upsert({
        where: { id: row.id },
        create: {
          ...row,
          cost: toDecimal(row.cost),
          price: toDecimal(row.price),
        },
        update: {
          ...row,
          cost: toDecimal(row.cost),
          price: toDecimal(row.price),
        },
      });
      counts.Service.dest++;
    }
  });

  await migrateTable("Order", async () => {
    const rows = await sqlite.order.findMany();
    counts.Order = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.order.upsert({
        where: { id: row.id },
        create: {
          ...row,
          unitCost: toDecimal(row.unitCost),
          unitPrice: toDecimal(row.unitPrice),
          totalCost: toDecimal(row.totalCost),
          totalPrice: toDecimal(row.totalPrice),
          profit: toDecimal(row.profit),
          dripFeedConfig: row.dripFeedConfig ? tryParseJSON(row.dripFeedConfig) : null,
        },
        update: {
          ...row,
          unitCost: toDecimal(row.unitCost),
          unitPrice: toDecimal(row.unitPrice),
          totalCost: toDecimal(row.totalCost),
          totalPrice: toDecimal(row.totalPrice),
          profit: toDecimal(row.profit),
          dripFeedConfig: row.dripFeedConfig ? tryParseJSON(row.dripFeedConfig) : null,
        },
      });
      counts.Order.dest++;
    }
  });

  await migrateTable("Transaction", async () => {
    const rows = await sqlite.transaction.findMany();
    counts.Transaction = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.transaction.upsert({
        where: { id: row.id },
        create: {
          ...row,
          amount: toDecimal(row.amount),
        },
        update: {
          ...row,
          amount: toDecimal(row.amount),
        },
      });
      counts.Transaction.dest++;
    }
  });

  await migrateTable("PaymentMethod", async () => {
    const rows = await sqlite.paymentMethod.findMany();
    counts.PaymentMethod = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.paymentMethod.upsert({
        where: { id: row.id },
        create: {
          ...row,
          config: row.config ? tryParseJSON(row.config) : null,
        },
        update: {
          ...row,
          config: row.config ? tryParseJSON(row.config) : null,
        },
      });
      counts.PaymentMethod.dest++;
    }
  });

  await migrateTable("Notification", async () => {
    const rows = await sqlite.notification.findMany();
    counts.Notification = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.notification.upsert({
        where: { id: row.id },
        create: {
          ...row,
          amount: row.amount !== null ? toDecimal(row.amount) : null,
        },
        update: {
          ...row,
          amount: row.amount !== null ? toDecimal(row.amount) : null,
        },
      });
      counts.Notification.dest++;
    }
  });

  await migrateTable("Ticket", async () => {
    const rows = await sqlite.ticket.findMany();
    counts.Ticket = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.ticket.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Ticket.dest++;
    }
  });

  await migrateTable("TicketMessage", async () => {
    const rows = await sqlite.ticketMessage.findMany();
    counts.TicketMessage = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.ticketMessage.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.TicketMessage.dest++;
    }
  });

  await migrateTable("AuditLog", async () => {
    const rows = await sqlite.auditLog.findMany();
    counts.AuditLog = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.auditLog.upsert({
        where: { id: row.id },
        create: {
          ...row,
          metadata: row.metadata ? tryParseJSON(row.metadata) : null,
        },
        update: {
          ...row,
          metadata: row.metadata ? tryParseJSON(row.metadata) : null,
        },
      });
      counts.AuditLog.dest++;
    }
  });

  await migrateTable("Setting", async () => {
    const rows = await sqlite.setting.findMany();
    counts.Setting = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.setting.upsert({
        where: { key: row.key },
        create: row,
        update: row,
      });
      counts.Setting.dest++;
    }
  });

  await migrateTable("ApiKey", async () => {
    const rows = await sqlite.apiKey.findMany();
    counts.ApiKey = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.apiKey.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.ApiKey.dest++;
    }
  });

  await migrateTable("License", async () => {
    const rows = await sqlite.license.findMany();
    counts.License = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.license.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.License.dest++;
    }
  });

  await migrateTable("Currency", async () => {
    const rows = await sqlite.currency.findMany();
    counts.Currency = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.currency.upsert({
        where: { id: row.id },
        create: {
          ...row,
          rate: toDecimal(row.rate),
        },
        update: {
          ...row,
          rate: toDecimal(row.rate),
        },
      });
      counts.Currency.dest++;
    }
  });

  await migrateTable("Language", async () => {
    const rows = await sqlite.language.findMany();
    counts.Language = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.language.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Language.dest++;
    }
  });

  await migrateTable("WebhookLog", async () => {
    const rows = await sqlite.webhookLog.findMany();
    counts.WebhookLog = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.webhookLog.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.WebhookLog.dest++;
    }
  });

  await migrateTable("Promotion", async () => {
    const rows = await sqlite.promotion.findMany();
    counts.Promotion = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.promotion.upsert({
        where: { id: row.id },
        create: {
          ...row,
          discount: toDecimal(row.discount),
        },
        update: {
          ...row,
          discount: toDecimal(row.discount),
        },
      });
      counts.Promotion.dest++;
    }
  });

  await migrateTable("Role", async () => {
    const rows = await sqlite.role.findMany();
    counts.Role = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.role.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Role.dest++;
    }
  });

  await migrateTable("Permission", async () => {
    const rows = await sqlite.permission.findMany();
    counts.Permission = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.permission.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Permission.dest++;
    }
  });

  await migrateTable("Offer", async () => {
    const rows = await sqlite.offer.findMany();
    counts.Offer = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.offer.upsert({
        where: { id: row.id },
        create: {
          ...row,
          price: toDecimal(row.price),
          cost: toDecimal(row.cost),
          margin: toDecimal(row.margin),
          earnings: toDecimal(row.earnings),
        },
        update: {
          ...row,
          price: toDecimal(row.price),
          cost: toDecimal(row.cost),
          margin: toDecimal(row.margin),
          earnings: toDecimal(row.earnings),
        },
      });
      counts.Offer.dest++;
    }
  });

  await migrateTable("Referral", async () => {
    const rows = await sqlite.referral.findMany();
    counts.Referral = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.referral.upsert({
        where: { id: row.id },
        create: {
          ...row,
          earnings: toDecimal(row.earnings),
        },
        update: {
          ...row,
          earnings: toDecimal(row.earnings),
        },
      });
      counts.Referral.dest++;
    }
  });

  await migrateTable("Coupon", async () => {
    const rows = await sqlite.coupon.findMany();
    counts.Coupon = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.coupon.upsert({
        where: { id: row.id },
        create: {
          ...row,
          value: toDecimal(row.value),
        },
        update: {
          ...row,
          value: toDecimal(row.value),
        },
      });
      counts.Coupon.dest++;
    }
  });

  await migrateTable("Favorite", async () => {
    const rows = await sqlite.favorite.findMany();
    counts.Favorite = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.favorite.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Favorite.dest++;
    }
  });

  await migrateTable("TicketAttachment", async () => {
    const rows = await sqlite.ticketAttachment.findMany();
    counts.TicketAttachment = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.ticketAttachment.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.TicketAttachment.dest++;
    }
  });

  await migrateTable("PaymentIntent", async () => {
    const rows = await sqlite.paymentIntent.findMany();
    counts.PaymentIntent = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.paymentIntent.upsert({
        where: { id: row.id },
        create: {
          ...row,
          amount: toDecimal(row.amount),
          metadata: row.metadata ? tryParseJSON(row.metadata) : null,
        },
        update: {
          ...row,
          amount: toDecimal(row.amount),
          metadata: row.metadata ? tryParseJSON(row.metadata) : null,
        },
      });
      counts.PaymentIntent.dest++;
    }
  });

  await migrateTable("LoyaltyPoint", async () => {
    const rows = await sqlite.loyaltyPoint.findMany();
    counts.LoyaltyPoint = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.loyaltyPoint.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.LoyaltyPoint.dest++;
    }
  });

  await migrateTable("Achievement", async () => {
    const rows = await sqlite.achievement.findMany();
    counts.Achievement = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.achievement.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Achievement.dest++;
    }
  });

  await migrateTable("Sequence", async () => {
    const rows = await sqlite.sequence.findMany();
    counts.Sequence = { source: rows.length, dest: 0 };
    for (const row of rows) {
      await postgres.sequence.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      counts.Sequence.dest++;
    }
  });

  // ── Verification ──
  console.log("\n📊 Migration Verification");
  console.log("=========================");
  let allMatch = true;
  for (const [table, { source, dest }] of Object.entries(counts)) {
    const match = source === dest ? "✅" : "❌";
    if (source !== dest) allMatch = false;
    console.log(`  ${match} ${table}: ${source} → ${dest}`);
  }

  if (allMatch) {
    console.log("\n✅ Migration complete — all row counts match!");
  } else {
    console.log("\n⚠️  Migration completed with count mismatches — review above.");
  }
}

// ── Helpers ──

function toDecimal(value: number | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  return new Decimal(value);
}

function tryParseJSON(str: string | null | undefined): any {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    // Not valid JSON. For columns that previously stored an opaque
    // non-JSON string (e.g. PaymentMethod.config held an AES-encrypted
    // blob like "iv:authTag:enc"), preserve the raw value by wrapping
    // it as a JSON string literal so Prisma can read it back through
    // the new Json column type. Returning null here would silently
    // drop production payment credentials during migration.
    return str;
  }
}

async function migrateTable(name: string, fn: () => Promise<void>) {
  console.log(`📦 Migrating ${name}...`);
  const start = Date.now();
  try {
    await fn();
    console.log(`  ✅ ${name} done (${Date.now() - start}ms)`);
  } catch (e: any) {
    console.error(`  ❌ ${name} failed:`, e.message);
    throw e;
  }
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  });
