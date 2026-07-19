# ADMIN-FIX-BATCH-2 — full-stack-developer

## Task
Apply 6 remaining fixes (4 medium + 2 low) from the ADMIN-AUDIT-1 report to
finish syncing the admin panel with what's actually implemented. This batch
closes out the Medium + Low findings (Batch-1 closed Critical + High).

## Work Log

### Pre-flight
- Read `worklog.md` + `agent-ctx/ADMIN-FIX-BATCH-1-full-stack-developer.md` for
  context. Batch-1 explicitly deferred all 6 fixes addressed here.
- Confirmed actual schema fields (Provider has no `lastSyncAt`; Setting has no
  `category`/`type`/`description`; License.plan uses reseller/agency/enterprise/
  white_label — NOT the brief's suggested starter/pro/business/enterprise).
- Confirmed `src/lib/huntsmm.ts` had no `getHuntSmmServices` helper — added one.

### MEDIUM FIX 1 — Remove German from seed (Option A)
- `prisma/seed-settings.ts`: removed `de` from the languages array (down to 4
  languages: en, es, pt, fr) + added `deleteMany({ where: { code: "de" } })`
  cleanup so re-seeding converges.
- `src/lib/i18n.ts`: updated header comment from `en, es, pt, fr, de` →
  `en, es, pt, fr` with a note that German was removed pending a complete `de`
  translation pack.
- Decision rationale: `i18n.ts` has zero German keys — well below the 80%
  threshold. Shipping a language row with no UI strings would force every label
  to fall back to English.

### MEDIUM FIX 2 — Real provider sync endpoint
- `src/lib/huntsmm.ts`: added `getHuntSmmServices(apiKey, apiUrl?)` that POSTs to
  the HuntSMM `services` action and returns the parsed array. Throws on HTTP
  errors, auth failures (`{ error: "..." }` payloads), and non-array payloads.
- `src/app/api/admin/providers/[id]/sync/route.ts`: full rewrite.
  - Reads Provider by `[id]`; 404 if not found.
  - If `apiUrl`/`name` contains `huntsmm.com` → calls `getHuntSmmServices()`
    (prefers DB `apiKey`, falls back to `process.env.HUNTSMM_API_KEY`).
  - Upserts each remote service into the Service table by `name` (unique). Uses
    the same `[<remote-id>] <remote-name>` format as `prisma/sync-huntsmm.ts`
    so re-syncing converges. 30% markup preserved. Detects platform/quality/
    category using the same heuristics (copied locally to avoid coupling).
  - Updates `provider.status = "healthy"` + measured latency on success.
  - Returns `{ ok: true, synced, provider, syncResult, message }`.
  - Non-HuntSMM providers → 501 `"Sync not implemented for this provider..."`.
  - try/catch wraps the whole flow; on failure sets `provider.status =
    "degraded"`, audits `provider.sync_failed`, returns 502 with the error
    message. Inner `.update().catch(()=>{})` ensures no re-throw from catch.
  - Audits `provider.sync` on success.
  - Uses typed `requireAdmin()` result (`user!.id`) — no more `(session!.user
    as any).id` cast.

### MEDIUM FIX 3 — Refunds panel filter
- `src/components/novsmm/admin-panel.tsx` `AdminRefunds`: derived `refundable`
  list filtered by `["topup", "sale"].includes(t.type) && t.status ===
  "completed"`. Table iterates `refundable`.
- Added amber info panel: "Showing refundable transactions only (top-ups and
  sales). Withdrawals, referral bonuses, fees, and existing refunds are excluded."
- Updated header count ("refundable transactions") and empty-state copy.
- Backend: the listing endpoint is `GET /api/admin/overview` (`recentTransactions`
  already `status: "completed"`). Deliberately did NOT add a `type` filter there
  — the Overview tab also reads `recentTransactions`. Frontend filtering is the
  surgical fix.

### MEDIUM FIX 4 — Dynamic settings keys
- `src/components/novsmm/admin-panel.tsx` `AdminSettingsTab`: removed hardcoded
  `editableKeys` array. The component now:
  1. Reads every key from `useAdminSettings()` (returns `{ settings: Record<string,
     string> }`).
  2. Groups by the prefix before the first "." (platform, fees, limits, security,
     oauth, payments, …) via `useMemo`. Keys without a dot land in a "General"
     bucket sorted last so nothing is hidden.
  3. Renders one card per group; each setting is either:
     - a `number` Input when the value parses as a finite number
       (handles `limits.*`, `fees.*`, `security.rateLimitPerMinute`);
     - a `text` Input otherwise;
     - a read-only dashed input for encrypted credential blobs (keys starting
       with `oauth:` or `payments:`) — editing ciphertext would corrupt creds;
       the dedicated Social Auth / Payments tabs are the right place.
  4. Save button sends only the changed values via the existing PATCH.
- Setting model has no category/type/description — per the brief, render all keys
  with text inputs (plus the numeric + read-only refinements above).

### LOW FIX 5 — License plan enum validation
- `src/lib/validations.ts`: added `LICENSE_PLANS = ["reseller", "agency",
  "enterprise", "white_label"] as const`, `LicensePlan` type,
  `createLicenseSchema` (Zod, strict), `updateLicenseSchema` (Zod, strict).
  Both constrain `plan` to the enum.
- `src/app/api/admin/licenses/route.ts`:
  - POST now `safeParse`s with `createLicenseSchema`. On failure, if the first
    issue path is `plan`, returns 422 with `Invalid plan. Must be one of:
    reseller, agency, enterprise, white_label` — otherwise surfaces the Zod
    message. Removed manual `if (!customerName || …)` check (now covered by
    schema) and `plan ?? "reseller"` fallback (schema defaults plan).
  - PATCH now `safeParse`s with `updateLicenseSchema`. Same 422 plan-error
    handling. PATCH now also accepts `plan` as an editable field (was previously
    silently ignored — only domain/ipAllowlist/maxUsers/maxOrders/expiresAt +
    status actions were applied).
  - Both handlers switched from `(session!.user as any).id` to typed `user!.id`.
  - Added safe-JSON-parse to PATCH (was missing — would have thrown 500 on bad
    body).

### LOW FIX 6 — Social Auth multi-provider UI
- `src/app/api/admin/social-auth/route.ts`: full rewrite.
  - Exports `SOCIAL_AUTH_PROVIDERS = ["google", "facebook", "github", "twitter"]
    as const`.
  - GET always returns an entry for every supported provider (with
    `{ configured, source: "db" | "env" | null }`) so the UI can render all 4
    cards deterministically. A provider is `configured` if either a
    `oauth:<provider>` Setting row exists in the DB, or the matching env-var pair
    (`GOOGLE_CLIENT_ID`/`..._SECRET`, `FACEBOOK_*`, `GITHUB_*`, `TWITTER_*`) is
    set. `source` distinguishes the two so the UI can warn that env-var-
    configured providers can't be disabled from the panel.
  - POST validates `provider` against the enum (was: rejected anything but
    "google"). Encrypts `{ clientId, clientSecret }` via `encryptJSON` and
    upserts the `oauth:<provider>` Setting row. Mirrors creds into `process.env`
    at runtime (preserves the legacy "DB creds take effect immediately"
    behaviour for Google and extends to the new providers).
  - New DELETE handler — accepts `{ provider }` and `deleteMany`s the
    `oauth:<provider>` Setting row + clears the runtime env override. Powers
    the UI's "Disable" button.
  - All three handlers audit the action.
- `src/components/novsmm/admin-panel.tsx` `AdminSocialAuth`: full rewrite.
  - `SOCIAL_PROVIDERS` constant drives the UI: 4 cards (Google, Facebook,
    GitHub, Twitter/X) each with provider glyph (inline SVG), label, redirect
    URL (`https://novsmm.shop/api/auth/callback/<provider>`), and field
    placeholders.
  - Per-provider state: `creds[provider] = { clientId, clientSecret }` and
    `statuses[provider] = { configured, source }`.
  - Each card renders: Client ID input, Client Secret input (password),
    read-only Redirect URL with copy-to-clipboard button, "Save & enable" /
    "Update credentials" button (POST), and a "Disable" button (DELETE, only
    when configured, disabled when `source === "env"`).
  - Disable is gated by an AlertDialog confirmation.
  - `useCallback`-wrapped `refresh()` re-pulls statuses after each save/remove.
  - 2-column responsive grid (`lg:grid-cols-2`), mobile-first.

## Files Modified
- `prisma/seed-settings.ts` — German removed from languages array + cleanup
  deleteMany.
- `src/lib/i18n.ts` — header comment updated (no `de` translation pack).
- `src/lib/huntsmm.ts` — added `getHuntSmmServices()` helper.
- `src/app/api/admin/providers/[id]/sync/route.ts` — real HuntSMM sync, 501 for
  others, degraded-on-failure, audit log.
- `src/components/novsmm/admin-panel.tsx` — AdminRefunds filter + note;
  AdminSettingsTab dynamic grouping; AdminSocialAuth multi-provider UI.
- `src/lib/validations.ts` — added LICENSE_PLANS, LicensePlan,
  createLicenseSchema, updateLicenseSchema.
- `src/app/api/admin/licenses/route.ts` — POST + PATCH now Zod-validate (incl.
  plan enum), PATCH accepts `plan` updates, safe JSON parse, typed user.
- `src/app/api/admin/social-auth/route.ts` — multi-provider GET/POST + new
  DELETE handler.

## Files Created
- None (all changes were in-place refactors of existing files).

## Lint Result
- `bun run lint` → **0 errors, 3 warnings** — all pre-existing and unrelated
  (`scripts/load-test.js` anonymous default export + 2 ARIA warnings in
  `dashboard-shell.tsx`'s existing combobox usage).

## Issues Encountered
- Task spec for FIX 5 suggested plan enum `["starter", "pro", "business",
  "enterprise"]` but the actual schema/UI values are `["reseller", "agency",
  "enterprise", "white_label"]`. Followed the brief ("Use the actual values
  you find") — documented in code comments.
- Task spec for FIX 2 suggested `audit(req, "provider.sync", { providerId,
  synced: N })` but our `audit()` helper has signature `(userId, action,
  entity, entityId, metadata)`. Used the actual signature:
  `audit(adminId, "provider.sync", "provider", provider.id, { provider,
  synced, latency, status })`.
- Task spec for FIX 2 mentioned `provider.lastSyncAt = now`. Provider schema
  has no `lastSyncAt` column. Used the existing `updatedAt` (Prisma
  `@updatedAt`) — auto-bumped on the `provider.update()` call.
- Task spec for FIX 4 mentioned `category/type/description` on the Setting
  model — none of those fields exist (only `id, key, value`). Followed the
  brief's fallback ("just render all keys with text inputs") with the small
  refinements noted above (numeric detection, encrypted read-only display).
- Task spec for FIX 6 suggested possibly adding a `provider` field to a
  `SocialAuth` table. No SocialAuth table exists — credentials are already
  stored as encrypted JSON in `Setting` rows keyed `oauth:<provider>`.
  Extended the existing pattern rather than introducing a new table (kept it
  simple, per the brief).

## Fixes Not Completed
None — all 6 fixes are complete. The audit's only remaining items were the
High-severity ones already closed by ADMIN-FIX-BATCH-1, plus minor/cosmetic
issues outside the scope of this batch.
