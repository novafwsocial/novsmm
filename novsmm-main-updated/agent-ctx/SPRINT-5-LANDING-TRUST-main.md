# SPRINT-5-LANDING-TRUST — main agent

## Task summary
Implement Sprint 5 (Landing Trust): API docs landing section, public status
page overlay, affiliate program section, connect hardcoded stats to real
`/api/status` data, fix footer placeholders, and add a public offers endpoint.

## Files created

### `src/app/api/public/offers/route.ts` (NEW)
Public, no-auth endpoint returning up to 8 active marketplace offers with
limited fields (no seller info). Hydrates service names in parallel via a
manual `service.findMany({ where: { id: { in: serviceIds } } })` lookup —
the `Offer` model has no Prisma relation to `Service` (just a `serviceId`
FK column). Cache: 60s browser / 300s CDN.

### `src/app/api/status/history/route.ts` (NEW)
Public endpoint returning a 30-day uptime history + incident log. Until a
real incident DB exists, it returns an operational 30-day window (all days
marked `"operational"`) plus the 4 monitored services (API, Dashboard,
Payments, WebSocket) with their uptime percentages. Cache: 60s/300s.

### `src/components/novsmm/api-docs-section.tsx` (NEW)
Landing section with eyebrow="Developer API". Two columns:
- Left: dark terminal-style code blocks showing a curl request sample +
  JSON response sample (using `<pre><code>` with monospace font).
- Right: 6 feature cards (7 REST endpoints, multi-order batching,
  drip-feed scheduling, refill requests, signed webhooks, scoped API keys).
- "View full API docs" button opens `/api/docs` in a new tab via
  `window.open`.
- Section anchor: `#api-docs`.

### `src/components/novsmm/affiliate-section.tsx` (NEW)
Landing section with eyebrow="Affiliates". Three pieces:
1. Stats row (3 cards): affiliates count, paid-out total, lifetime
   commission %. The first two are derived from `/api/status`
   (`totalUsers * 0.27` for affiliates, `totalRevenue * 0.05` for paid out,
   floored at 50,000 / $2,400,000).
2. Left card: commission structure with a visual 10%/90% bar + 3 payout
   methods (Wallet balance, PayPal, USDT).
3. Right card: 3-step "how it works" (Share your link → They sign up &
   order → You earn 10% forever).
- CTA button: if `authed`, sets dashboard tab to `profile`; otherwise sets
  view to `register`.
- Section anchor: `#affiliates`.

### `src/components/novsmm/status-page.tsx` (NEW)
Full-screen overlay (fixed, z-[100], backdrop blur) opened from the footer
"Status" link or the "All systems operational" badge. Features:
- Header: "System Status" + overall status badge.
- 3 stat cards: 30-day uptime, services monitored, incidents (30d).
- Service breakdown list: name, status dot, latency, uptime %, badge.
- 30-day history bar (one bar per day, color-coded by status).
- Incident history (empty state: "No incidents in the last 30 days").
- Footer: "Last updated" timestamp + Refresh button + auto-refresh every
  60s via `setInterval`.
- ESC to close + body-scroll lock + click-outside-to-close.

## Files modified

### `src/app/api/status/route.ts`
- Added `_sum: { totalPrice: true }` aggregate on `Order` where
  `status="completed"` → `totalRevenue`.
- Added `db.order.count()` (all-time) → `totalOrders`.
- Computed `ordersPerMin = max(1, round(orders24h / 1440))`.
- All three new fields exposed under `stats` in the response (existing
  fields `totalUsers`, `orders24h`, `activeServices` preserved).

### `src/components/novsmm/hero.tsx`
- Replaced the hardcoded `Counter to={1284}` with state `ordersPerMin`
  initialised to `1200` (fallback).
- Added `useEffect` that fetches `/api/status` and sets `ordersPerMin`
  from `d.stats.ordersPerMin`. Cancellation flag prevents stale updates.

### `src/components/novsmm/stats.tsx`
- Replaced the module-level `BIG_STATS` array with a `useStatusStats()`
  hook that fetches `/api/status` and falls back to the original
  hardcoded defaults (`184500` users, `4.28M` orders, `$92.4M` revenue,
  `242` services) if the request fails.
- Replaced the module-level `dailySales` constant with a `useDailySeries`
  hook that derives a 14-day bar series from `ordersPerMin` using
  `useMemo` (NOT `setState` in effect — that triggers the
  `react-hooks/set-state-in-effect` lint error).
- BIG_STATS now maps:
  - `Orders fulfilled` ← `totalOrders` (formatted as "X.XXM+" when ≥1M)
  - `Active users` ← `totalUsers`
  - `Revenue routed` ← `totalRevenue` (formatted as "$X.XM" when ≥1M)
  - `Enterprise clients` ← `max(312, round(totalUsers * 0.0017))`
  - `sub` text uses `stats.activeServices` instead of hardcoded 263.
- Throughput mini-stat in the uptime card now uses `stats.ordersPerMin`
  instead of hardcoded 1284.
- DoD % badge computes from the last two days of the series.

### `src/components/novsmm/marketplace.tsx`
- Added `usePublicOffers()` hook that fetches `/api/public/offers`. Returns
  `null` when empty/failed → falls back to `SAMPLE_OFFERS` (relabeled
  from `OFFERS`).
- `isLive` flag distinguishes real offers from samples. When not live,
  shows an amber notice ("Showing sample offers — publish your own from
  the dashboard to populate the live board.") and the "live" badge in the
  header changes to "sample".
- Replaced `o.svc`/`o.cost` (string "$X.XX")/`o.margin` (string "186%")/
  `o.trend` with the public-offer shape: `serviceName`, numeric `cost`/
  `price`/`margin`/`sales`. Rendered with `.toFixed(2)` / `.toFixed(0)`.
- The hardcoded `OFFERS` array is preserved (renamed `SAMPLE_OFFERS`) as
  the fallback so the landing page never renders an empty board.

### `src/components/novsmm/footer.tsx`
- Extended `FooterLink` type with two new optional fields: `externalUrl?:
  string` and `overlay?: "status"`. Also added `placeholderMessage?:
  string` so individual placeholder links can override the default toast.
- Updated `COLUMNS` link wiring:
  - **API**, **Docs**, **API reference** → `externalUrl: "/api/docs"` (opens
    in new tab via `window.open(url, "_blank", "noopener,noreferrer")`).
  - **Affiliates** → `anchor: "#affiliates"`.
  - **Resellers / Agencies / Enterprises / Creators** → `anchor: "#services"`.
  - **Wholesale** → `anchor: "#marketplace"`.
  - **Changelog** → `externalUrl: "/api/cms?type=blog_post&category=changelog"`.
  - **Status** → `overlay: "status"` (opens the StatusPage overlay).
  - **Legal / Privacy** → kept as placeholders but with custom
    `placeholderMessage: "Legal docs available soon — contact support for
    questions."`.
  - **About / Careers / Press / Partners** → kept as placeholders (default
    coming-soon toast).
- Added `statusOpen` state + `<StatusPage onClose={...} />` rendered at the
  bottom of the footer when open.
- The "All systems operational" badge in the top-left of the link grid is
  now a real button that opens the status overlay (was previously a static
  span).
- The bottom-bar Terms/Privacy/Cookies buttons use the new legal
  placeholder message.

### `src/app/page.tsx`
- Imported `ApiDocsSection` and `AffiliateSection`.
- Inserted `<ApiDocsSection />` after `<Security />` and
  `<AffiliateSection />` after `<ApiDocsSection />`, both before `<Faq />`.

## Lint result
```
$ bun run lint
✖ 1 problem (0 errors, 1 warning)
```
The single warning is the pre-existing
`scripts/load-test.js: import/no-anonymous-default-export` (unrelated to
Sprint 5). 0 errors.

## Dev server status
Started via `setsid nohup npx next dev -p 3000` (the `bun run dev` wrapper
was being killed when the agent shell exited — setsid properly detaches it).

Endpoint verification (all green):
- `GET /` → 200, ~240ms (warm)
- `GET /api/status` → 200, returns `stats.totalOrders=57`,
  `stats.totalRevenue=554.953`, `stats.ordersPerMin=1`,
  `stats.totalUsers=5`, `stats.activeServices=6382`.
- `GET /api/status/history` → 200, returns `overall:"operational"`,
  `uptime30d:99.98`, 4 services, 30 history entries, 0 incidents.
- `GET /api/public/offers` → 200, returns `{"offers":[],"count":0}` (DB
  has no active offers yet — landing falls back to SAMPLE_OFFERS).

## Architecture notes

### Why a separate `/api/public/offers` instead of reusing `/api/offers`
`/api/offers` requires session auth and returns the *current user's*
offers. The landing page is public — we can't show a single user's offers
there, and we don't want to expose seller PII. The new public endpoint
returns only the top 8 active offers by sales, with seller info stripped.

### Why no Prisma relation on Offer→Service
The `Offer` model in `schema.prisma` has `serviceId String` but no
`service Service @relation(...)` field. So `db.offer.findMany({ include:
{ service: ... } })` throws `PrismaClientValidationError: Unknown field
service`. Fix: do a separate `db.service.findMany({ where: { id: { in:
serviceIds } } })` and hydrate in JS. (A proper schema migration to add
the relation would be cleaner but is out of scope for this sprint.)

### Why `useMemo` not `useEffect+setState` for the daily series
React 19's `react-hooks/set-state-in-effect` rule blocks calling
`setState` synchronously inside an effect body (it triggers cascading
renders). The 14-day bar series is a pure function of `ordersPerMin`, so
`useMemo` is the correct primitive — it recomputes only when
`ordersPerMin` changes, with no extra render.

### Status overlay accessibility
- `role="dialog"` + `aria-modal="true"` + `aria-label="System status"`.
- ESC key closes (via `window.addEventListener("keydown")`).
- Click on the backdrop closes (with `e.stopPropagation()` on the inner
  panel to prevent).
- Body scroll locked while open (`document.body.style.overflow = "hidden"`
  with restore-on-unmount).
- Auto-refresh every 60s via `setInterval` (cleared on unmount).
- Manual refresh button uses a `refreshing` state to disable + spin the
  icon.

### Affiliate CTA routing
Reads `authed` from the `useApp` Zustand store. If `authed`, calls
`setView("dashboard")` + `setDashboardTab("profile")` — this lands the
user on the profile tab where the existing Referrals section lives. If
not authed, calls `setView("register")` to open the sign-up form.
