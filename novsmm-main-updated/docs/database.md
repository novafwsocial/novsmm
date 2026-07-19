# NOVSMM — Database Documentation

## Overview

NOVSMM uses Prisma ORM with PostgreSQL as the canonical deployment provider. The active schema contains 43 models with 40+ indexes optimized for the platform's query patterns. A low-memory SQLite profile is generated explicitly by the low-memory Docker build; it must not replace the canonical schema in the repository.

## Schema Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Canonical active schema (PostgreSQL provider; shared `Json` types) |
| `prisma/schema.postgres.prisma` | Legacy PostgreSQL reference (not used automatically and not equivalent to the active schema) |

See [docs/postgresql-migration.md](postgresql-migration.md) for migration instructions.

## Models (32)

### NextAuth Tables

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| `User` | Authentication, balance, plan | email (unique), username (unique) |
| `Account` | OAuth provider accounts | [provider, providerAccountId] (unique), userId |
| `Session` | Database sessions (unused — JWT strategy) | sessionToken (unique), userId |
| `VerificationToken` | Email verification tokens | token (unique), [identifier, token] |

### Business Models

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| `Provider` | SMM API providers | name (unique), status |
| `Service` | SMM service catalog (6,000+) | name (unique), platform, status |
| `Order` | Customer orders | publicId (unique), userId, status, serviceId, createdAt, [userId, status], [userId, createdAt] |
| `Transaction` | Wallet ledger | publicId (unique), userId, type, status, reference, createdAt, [userId, type], [userId, status], [userId, createdAt] |
| `PaymentMethod` | Payment gateway config | name (unique), status |
| `Notification` | User notifications | userId, read, createdAt, [userId, read], [userId, createdAt] |
| `Ticket` | Support tickets | publicId (unique), userId, status, [userId, status] |
| `TicketMessage` | Ticket messages | ticketId |
| `AuditLog` | Forensic logging | userId, entity, action, createdAt |
| `Setting` | Key-value platform config | key (unique) |

### Security Models

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| `ApiKey` | Reseller API keys | publicId (unique), keyHash (unique), lookupHash (unique), userId, status |
| `License` | Panel licenses | licenseKey (unique), licenseHash (unique), lookupHash (unique), status, customerEmail, customerId |

### Reference Data

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| `Currency` | Supported currencies | code (unique), status |
| `Language` | Supported languages | code (unique), status |
| `WebhookLog` | Payment webhook logs | provider, status, createdAt |

### Billing Models

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| `Subscription` | Plan subscriptions | userId, status, stripeSubscriptionId, [userId, status] |
| `Invoice` | Invoices | publicId (unique), userId, status, createdAt, [userId, status], [userId, createdAt] |
| `Promotion` | Temporary discounts | status, serviceId |

### RBAC Models

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| `Role` | User roles | name (unique) |
| `Permission` | Role permissions | [roleId, resource] (unique), roleId |

### Marketplace Models

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| `Offer` | Reseller marketplace offers | userId, status, serviceId, [userId, status] |
| `Referral` | Referral tracking | code (unique), referrerId |
| `Coupon` | Discount coupons | code (unique), status |
| `Favorite` | User favorite services | [userId, serviceId] (unique), userId, serviceId |

### Supporting Models

| Model | Purpose | Key Indexes |
|-------|---------|-------------|
| `TicketAttachment` | File attachments | messageId |
| `PaymentIntent` | Payment tracking | publicId (unique), userId, status, providerIntentId |
| `LoyaltyPoint` | Loyalty point ledger | userId, orderId, [userId, createdAt] |
| `Achievement` | Unlocked achievements | [userId, type] (unique), userId |
| `Sequence` | Atomic ID generation | id (PK) |

## Key Design Decisions

### 1. Sequence Table for Atomic IDs

**Problem:** `db.<table>.count() + offset` caused race conditions on concurrent inserts.

**Solution:** `Sequence` model with `nextPublicId(prefix, seedOffset)` using interactive `$transaction`:

```typescript
const publicId = await nextPublicId("A", 10432);  // → "A-10433"
```

### 2. lookupHash for O(1) Key Validation

**Problem:** bcrypt-scan — loading ALL active API keys + looping `bcrypt.compare` per request (O(N) × 100ms).

**Solution:** SHA-256 `lookupHash` column for O(1) lookup, then `bcrypt.compare` on the single match:

```typescript
const lookupHash = crypto.createHash("sha256").update(key).digest("hex");
const apiKey = await db.apiKey.findFirst({ where: { lookupHash, status: "active" } });
if (apiKey && await bcrypt.compare(key, apiKey.keyHash)) { /* valid */ }
```

### 3. Interactive Transactions for Balance Operations

**Problem:** Balance check outside transaction → race condition (concurrent orders both pass check).

**Solution:** Conditional `updateMany` inside interactive `$transaction`:

```typescript
await db.$transaction(async (tx) => {
  const updated = await tx.user.updateMany({
    where: { id: userId, balance: { gte: totalPrice } },
    data: { balance: { decrement: totalPrice } },
  });
  if (updated.count === 0) throw new Error("INSUFFICIENT_BALANCE");
  // ... create order + transaction
});
```

### 4. Json Columns (String → Json)

**Problem:** JSON data stored as String with manual `JSON.stringify`/`JSON.parse`.

**Solution:** Converted 5 columns to Prisma `Json` type (works on both SQLite as TEXT and PostgreSQL as JSONB):

- `Order.dripFeedConfig`
- `PaymentMethod.config`
- `AuditLog.metadata`
- `Invoice.items`
- `PaymentIntent.metadata`

### 5. Graceful Degradation (Redis)

**Problem:** Redis not available in dev/sandbox.

**Solution:** All Redis operations fall back to in-memory equivalents (cache, rate limiter, brute-force tracker, queues).

## Query Patterns

### Hot Paths (indexed)

| Query | Index Used | Frequency |
|-------|-----------|-----------|
| `db.transaction.findFirst({ where: { reference } })` | Transaction.reference | Every webhook |
| `db.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })` | [userId, createdAt] | Every dashboard load |
| `db.user.findUnique({ where: { id } })` | User.id (PK) | Every authenticated request (cached in Redis) |
| `db.notification.findMany({ where: { OR: [{ userId }, { userId: null }] } })` | [userId, read] | Every notification poll |
| `db.apiKey.findFirst({ where: { lookupHash, status: "active" } })` | ApiKey.lookupHash | Every API key auth |

### N+1 Prevention

- Use `include` / `select` for relations (no sequential queries in loops)
- Use `createMany` instead of loops with `create` (admin broadcast)
- Use `Promise.all` for parallel independent queries

## Migration Guide

See [docs/postgresql-migration.md](postgresql-migration.md) for the complete SQLite → PostgreSQL migration guide.

## Backup

See [docs/disaster-recovery.md](disaster-recovery.md) for backup and restore procedures.
