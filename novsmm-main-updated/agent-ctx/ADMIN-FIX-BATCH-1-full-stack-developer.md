# ADMIN-FIX-BATCH-1 — full-stack-developer

## Task
Apply 8 fixes (3 critical + 5 high) from the ADMIN-AUDIT-1 report to sync the
admin panel with what's actually implemented.

## Work Log

### CRITICAL FIX 1 — Replace 4 fake providers with HuntSMM in seed
- Read `prisma/schema.prisma` Provider model first — only `id, name, apiUrl,
  apiKey, status, latency, services, serviceProviders, createdAt, updatedAt`
  exist. The task spec's `balance/currency/syncEnabled/lastSyncAt` fields are
  aspirational — used the actual schema.
- Replaced the 4 generic providers (Provider-01..04 with smmapi.io /
  boostpanel.dev / justsmm.net / royalpanel.com URLs) with a single HuntSMM
  row matching `prisma/sync-huntsmm.ts`.
- Added cleanup loop that `deleteMany({ where: { name } })` for the 4 obsolete
  names so re-seeding converges to a single HuntSMM provider.
- Re-bound all 12 demo services' `providerIdx` to 0 (HuntSMM only).
- The HuntSMM upsert now also updates `apiUrl` + `apiKey` on every seed run
  so a changed `HUNTSMM_API_KEY` env var is reflected without a re-sync.

### CRITICAL FIX 2 — Make provider-failover.ts read from DB
- Added `placeOrderWithProvider(provider, serviceId, link, qty)` helper that
  dispatches by `provider.apiUrl`:
  - `huntsmm.com` → `placeHuntSMMOrder()` (preserved verbatim). The DB-stored
    `apiKey` (if present) is preferred over the env var via `process.env`
    override (lightest-touch way to flow DB creds into the existing function
    without rewriting its signature).
  - Any other apiUrl → throws `Provider ${name} (${apiUrl}) not supported yet`
    so the failover loop logs + moves to the next mapping. Multi-provider is
    now architecturally honest — no silent HuntSMM fallback for non-HuntSMM
    providers.
- Wrapped each `placeOrderWithProvider` call in try/catch so an unsupported
  provider no longer breaks the whole failover chain.
- Legacy single-provider path: now reads the oldest provider from the DB
  (instead of always calling HuntSMM by name) so the legacy flow respects
  whatever provider the admin actually has configured.
- Imported `Provider` type from `@prisma/client` for type safety.

### CRITICAL FIX 3 — Remove hardcoded providers
- `src/components/novsmm/dashboard-data.ts`:
  - `ADMIN_PROVIDERS` replaced with a single HuntSMM-only entry + a comment
    that this is demo data (live admin reads from `/api/admin/providers`).
  - `TOPUP_METHODS` synced with the 5 canonical methods (Stripe, PayPal,
    Mercado Pago, NowPayments, Manual) — was missing Stripe + Manual.
- `src/app/api/admin/overview/route.ts`:
  - Replaced the hardcoded `Provider sync (P-03) — degraded` health entry
    with `HuntSMM sync — healthy`. Preserved the `{ label, val, ok }` shape
    that the frontend expects (the task spec's `{ service, status, message }`
    would have broken the UI).

### HIGH FIX 4 — Create /api/admin/payment-methods/test route
- New file `src/app/api/admin/payment-methods/test/route.ts`.
- POST endpoint with two modes:
  - `{ methodId }` → loads saved creds from DB via `decryptJSON(pm.config)`.
  - `{ method, credentials }` → ad-hoc test of creds the admin typed but
    hasn't saved yet (matches the existing `ConfigureCredentialsModal`
    `handleTest` payload).
- Per-method pings:
  - Stripe → `stripe.accounts.retrieve()` via `setStripeCredentials` +
    `getStripe` (runtime override cleared in `finally`).
  - PayPal → `https://api-m.paypal.com/v1/oauth2/token` with the
    client_credentials grant (token retrieval proves creds are valid).
  - Mercado Pago → `https://api.mercadopago.com/users/me` with bearer token.
  - NowPayments → `https://api.nowpayments.io/v1/balance` with `x-api-key`.
  - Manual → always OK (no creds needed).
- Returns `{ ok, method, message, details? }`.
- Accepts both lowercase slugs and pretty PaymentMethod.name strings (the
  frontend sends "Stripe" not "stripe").
- `requireAdmin()` guards the route.

### HIGH FIX 5 — Improve Stripe credential modal
- Added Stripe to the `credentialFields` map in `ConfigureCredentialsModal`
  with `secretKey` (sk_live_... or sk_test_...) + `webhookSecret` (whsec_...).
- Added a violet info panel (mirrors the Manual method's emerald info panel)
  above the form fields with:
  - Link to https://dashboard.stripe.com/apikeys (opens in new tab).
  - Required fields list.
  - Webhook URL: `https://novsmm.shop/api/webhooks/stripe`.
  - Events to subscribe to: `checkout.session.completed`,
    `payment_intent.payment_failed`, `charge.refunded`.

### HIGH FIX 6 — Add Coupons tab to admin
- Added `"coupons"` to the `AdminTab` union type in `app-store.ts`.
- Added `{ id: "coupons", label: "Coupons", icon: Ticket }` to `ADMIN_NAV`
  in `admin-panel.tsx` (imported `Ticket` from lucide-react).
- Wired `adminTab === "coupons"` → `<AdminCoupons />`.
- New `AdminCoupons` component:
  - Lists coupons in a table (code, type, value, usage, expires, status).
  - "Create coupon" button → opens `CouponModal` in create mode.
  - Edit button per row → opens `CouponModal` in edit mode.
  - Delete button per row → opens `AlertDialog` confirmation (warns if
    `usedCount > 0` that audit history will be lost).
- New `CouponModal` component:
  - Fields: code, type (percent/fixed), value, maxUses, expiresAt, status
    (status only in edit mode — Coupon schema has no `minOrder` field so
    that's omitted).
  - Code is uppercased on input.
  - Mirrors the existing `PromotionModal` structure (same Reveal/modal
    pattern, same datetime-local conversion helper).
- Added hooks in `src/hooks/use-api.ts`:
  - `useAdminCoupons` (GET)
  - `useCreateCoupon` (POST)
  - `useUpdateCoupon` (PATCH)
  - `useDeleteCoupon` (DELETE with body — required extending
    `api.delete` in `src/lib/api-client.ts` to accept an optional body).
- Extended `/api/admin/coupons/route.ts`:
  - PATCH now accepts any of `{ type, value, maxUses, expiresAt, status }`
    (was status-only). Validated with a zod schema.
  - Added a new DELETE handler that takes `{ id }` in the body. The route
    lives on the same path (no `[id]` subroute), matching the existing PATCH
    pattern. Hard-deletes the coupon + audits the action.

### HIGH FIX 7 — Rename Webhooks tab
- Renamed "Webhooks" → "Webhook Logs" in `ADMIN_NAV`.
- Added a small info panel at the top of `AdminWebhooks` clarifying that the
  view shows inbound webhook logs from payment providers, and that outbound
  webhooks (notifications sent to child panels) are managed via the API at
  `/api/admin/webhooks/outbound`.

### HIGH FIX 8 — Consolidate seed scripts
- Refactored `prisma/seed-settings.ts`, `prisma/seed-roles.ts`, and
  `prisma/seed-services.ts` to:
  - Export their main function (`seedSettings`, `seedRoles`, `seedServices`).
  - Only auto-run when invoked directly (guard:
    `process.argv[1]?.includes("seed-settings")` etc.) — keeps backward
    compat for `tsx prisma/seed-settings.ts`.
- Updated `prisma/seed.ts` to call all four (seed-settings, seed-roles,
  seed-services, seedEmailTemplates from `src/lib/email-templates.ts`) at
  the end of `main()`.
- Added `"seed": "npx tsx prisma/seed.ts"` to `package.json` (used `npx tsx`
  to match the existing worker scripts — tsx is not a direct dep).

## Files Modified
- `prisma/seed.ts` — HuntSMM-only providers + cleanup + service rebind +
  consolidation calls to seed-settings/seed-roles/seed-services/seedEmailTemplates.
- `prisma/seed-settings.ts` — exported `seedSettings()`, guarded auto-run.
- `prisma/seed-roles.ts` — exported `seedRoles()`, guarded auto-run.
- `prisma/seed-services.ts` — exported `seedServices()`, guarded auto-run.
- `src/lib/provider-failover.ts` — DB-driven provider dispatch via
  `placeOrderWithProvider`, unsupported providers throw + skip.
- `src/components/novsmm/dashboard-data.ts` — HuntSMM-only ADMIN_PROVIDERS,
  5-method TOPUP_METHODS.
- `src/app/api/admin/overview/route.ts` — HuntSMM sync health entry.
- `src/components/novsmm/admin-panel.tsx` — Coupons tab + AdminCoupons +
  CouponModal + Stripe credential help panel + Webhook Logs rename + note.
- `src/components/novsmm/app-store.ts` — added "coupons" to AdminTab union.
- `src/hooks/use-api.ts` — useAdminCoupons/useCreateCoupon/useUpdateCoupon/
  useDeleteCoupon hooks.
- `src/lib/api-client.ts` — `api.delete` now accepts an optional body.
- `src/app/api/admin/coupons/route.ts` — extended PATCH + added DELETE.
- `package.json` — added `"seed": "npx tsx prisma/seed.ts"`.

## Files Created
- `src/app/api/admin/payment-methods/test/route.ts` — POST endpoint that
  pings each payment provider's API to verify the saved (or ad-hoc) creds.

## Lint Result
- `bun run lint` → **0 errors, 3 warnings** (all pre-existing, unrelated to
  this batch).
- Dev server log shows clean compilation + requests succeeding.

## Issues Encountered
- The task spec for CRITICAL FIX 1 listed Provider fields (`balance`,
  `currency`, `syncEnabled`, `lastSyncAt`) that don't exist on the schema.
  Followed the instruction "Match the exact schema fields from
  `prisma/schema.prisma` Provider model" and used the actual fields
  (`apiUrl, apiKey, status, latency`). Same approach for `status: "active"`
  → schema comment says `healthy | degraded | down`, so used `healthy`.
- The task spec for CRITICAL FIX 3 proposed a different `health` object
  shape (`{ service, status, message }`). The frontend
  (`AdminOverview`) reads `h.label`/`h.val`/`h.ok`, so preserved the existing
  shape and only changed the content (label → "HuntSMM sync", val → "healthy",
  ok → true).
- The task spec for HIGH FIX 6 listed `minOrder` as a coupon field. The
  Coupon schema doesn't have that field — omitted it from the modal.
- The task spec for HIGH FIX 6 referenced `PATCH /api/admin/coupons/[id]`
  and `DELETE /api/admin/coupons/[id]`. Neither `[id]` subroute existed —
  the existing PATCH is body-driven (`{ id, status }`) on the base path.
  Extended the existing PATCH (now accepts more fields) and added a DELETE
  handler on the same base path (`{ id }` in body) to match.
- The task spec for HIGH FIX 8 suggested `"seed": "tsx prisma/seed.ts"`. tsx
  isn't a direct dep — used `"npx tsx prisma/seed.ts"` to match the
  existing worker scripts' invocation pattern.

## Fixes Not Completed
None — all 8 fixes are complete. Medium/low findings from the audit
(German translation pack, fake provider sync route, AdminRefunds filter,
AdminSettingsTab dynamic keys, License plan enum) were explicitly out of
scope for this batch.
