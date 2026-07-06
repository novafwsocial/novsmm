# ADR-001: PostgreSQL over SQLite for Production

## Status
Accepted

## Context
NOVSMM started with SQLite for rapid development. SQLite is file-based, single-writer, and lacks features needed for production at scale:
- No native enums (used String columns)
- No native JSON support (used String with manual JSON.stringify)
- No Decimal type (used Float for money — floating-point errors)
- No connection pooling (single connection)
- No read replicas
- Case-insensitive search is default (PostgreSQL requires `mode: "insensitive"`)

## Decision
Use **SQLite for development/sandbox** and **PostgreSQL for production**.

The Prisma schema is designed to work on both:
- `schema.prisma` — SQLite-compatible (String enums, Float money, Json columns stored as TEXT)
- `schema.postgres.prisma` — PostgreSQL production (native enums, Decimal, JsonB, VarChar)

A data migration script (`prisma/migrate-sqlite-to-postgres.ts`) handles the type transformations.

## Consequences
**Positive:**
- Dev environment is lightweight (no PostgreSQL install needed)
- Production gets native enums, JsonB, Decimal, connection pooling
- Same code works on both (via `src/lib/money.ts` + `src/lib/db-search.ts` helpers)

**Negative:**
- Two schema files to maintain
- Migration script needed for type transformations
- `mode: "insensitive"` must be added to search queries on PostgreSQL (handled by `ciContains()` helper)
