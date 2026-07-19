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

The canonical Prisma schema is `prisma/schema.prisma` and uses the PostgreSQL provider. It keeps shared `Json` fields so the application model remains portable. `prisma/schema.postgres.prisma` is retained only as a legacy reference and is not equivalent to the active schema; deployment scripts must never copy it over `schema.prisma`.

The low-memory SQLite profile is generated explicitly for that deployment mode and is not a second production schema to maintain.

A data migration script (`prisma/migrate-sqlite-to-postgres.ts`) handles the type transformations.

## Consequences
**Positive:**
- Dev environment is lightweight (no PostgreSQL install needed)
- Production gets native enums, JsonB, Decimal, connection pooling
- Same code works on both (via `src/lib/money.ts` + `src/lib/db-search.ts` helpers)

**Negative:**
- A dedicated low-memory SQLite build path must be kept separate from the canonical PostgreSQL schema
- Migration script needed for type transformations
- `mode: "insensitive"` must be added to search queries on PostgreSQL (handled by `ciContains()` helper)
