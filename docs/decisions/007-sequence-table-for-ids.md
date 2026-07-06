# ADR-007: Sequence Table for Atomic Public ID Generation

## Status
Accepted

## Context
Public IDs (e.g., `A-10432`, `TX-8842`, `T-201`, `INV-0001`) were generated using `db.<table>.count() + offset`. This caused:
1. **Race conditions** — two concurrent inserts could read the same count and generate the same publicId → unique constraint violation
2. **Full-table scans** — `count()` scans the entire table; at 1M+ rows this adds multi-second latency

## Decision
Create a **`Sequence` model** with one row per ID prefix. Use `nextPublicId(prefix, seedOffset)` which atomically increments the counter via an interactive Prisma `$transaction`:

```typescript
const publicId = await nextPublicId("A", 10432);  // → "A-10433"
```

## Consequences
**Positive:**
- Race-condition-free (atomic increment via transaction)
- O(1) lookup (indexed by `id` primary key)
- No full-table scans
- Backward compatible (seed offsets maintain existing ID sequences)
- Works on both SQLite and PostgreSQL

**Negative:**
- Additional table to manage
- One extra DB round-trip per ID generation (mitigated by being inside the same transaction as the insert)

**Migration:** All 15 call sites migrated from `count() + offset` to `nextPublicId()` in Phase 2.
