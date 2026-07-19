# ADR-008: SHA-256 lookupHash for O(1) API Key + License Validation

## Status
Accepted

## Context
API keys and licenses were validated by:
1. Loading ALL active keys/licenses from the database
2. Looping `bcrypt.compare(key, hash)` for each one

This is O(N) × ~100ms per bcrypt compare. With 100 keys, each API request took 10 seconds. With 1,000 keys, 100 seconds. **The public API was unusable at scale.**

bcrypt was used because it's one-way (can't be reversed to get the plaintext key). But bcrypt hashes can't be searched by equality — you have to compare against each one.

## Decision
Add a **`lookupHash` column** (SHA-256 of the plaintext key) to both `ApiKey` and `License` models. Validation now:
1. Compute SHA-256 of the provided key (O(1), ~0.01ms)
2. Look up by `lookupHash` (O(1) index lookup, ~1ms)
3. If found, `bcrypt.compare` on the SINGLE result (defense-in-depth, ~100ms)
4. If not found, fall back to legacy bcrypt-scan (for keys created before this change)

New keys get `lookupHash` set at creation time. Legacy keys self-heal: on first successful auth via fallback, `lookupHash` is backfilled.

## Consequences
**Positive:**
- O(1) lookup instead of O(N) scan
- 100 keys: 10s → 0.1s (100× faster)
- 1,000 keys: 100s → 0.1s (1,000× faster)
- Defense-in-depth: bcrypt still verifies the single match
- Self-healing: legacy keys auto-migrate on first use

**Negative:**
- Additional column + index
- SHA-256 is fast (not suitable for password hashing) — but that's why bcrypt is still the primary check
- Legacy keys without `lookupHash` still use the slow path until they self-heal

**Security note:** SHA-256 is used ONLY for lookup, NOT for authentication. The actual key validation is still bcrypt. A collision in SHA-256 would still need to pass bcrypt comparison.
