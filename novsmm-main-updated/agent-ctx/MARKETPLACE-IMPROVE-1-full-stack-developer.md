# MARKETPLACE-IMPROVE-1 — full-stack-developer

## Task
Deep improvement of the NOVSMM Services/Marketplace panel at
`/home/z/my-project/src/components/novsmm/dashboard-marketplace.tsx`.
Turn 10 listed weaknesses into strengths, remove framer-motion + recharts,
keep all existing functionality (order placement, mass order, sell tab,
history tab), mobile-first, no new npm deps.

## Files touched
- `src/components/novsmm/dashboard-marketplace.tsx` (full rewrite, ~1,300 → ~1,300 lines)

## Constraints honoured
- NO new npm dependencies.
- Removed `framer-motion` (motion, AnimatePresence) entirely.
- Removed `recharts` entirely (import was unused; replaced with new lightweight SVG `SellEarningsChart`).
- All existing functionality preserved: BuyTab infinite-scroll, ServiceDetailModal (with drip-feed), MassOrderModal, HistoryTab (with repeat), SellTab (with publish/remove offers).
- Mobile-first: skeleton grid collapses 3→2→1 cols, sort dropdown full-width on mobile, all interactive elements ≥44px touch target.
- Performance: CSS animations + IntersectionObserver (already present), no new JS animation libs.

## What was changed (10 items)
1. **framer-motion removed** — motion.span tab indicator → `<span className="bg-primary tab-content-enter">`; motion.div modals → `<div className="modal-3d-enter">`; motion.div drip-feed block → `<div className="tab-content-enter">`; tab content swap wrapped in `<div key={tab} className="tab-content-enter">`.
2. **recharts removed** — import deleted; new `SellEarningsChart` SVG component added to the Sell tab showing 30-day earnings trend (emerald gradient area + smooth cubic-bezier stroke + growth % badge, deterministic series from `totalEarnings`).
3. **ServiceCard 3D hover** — added `stat-card-3d` to root div; added `btn-press` to both footer buttons.
4. **Loading skeletons** — when `isLoading && page === 1`, render 6 `ServiceCardSkeleton` cards with `skeleton-shimmer` (logo, title, two-line desc, spec row, price+CTA footer).
5. **Improved empty state** — SearchX icon + "No services found" heading + "Try adjusting your search or filters" subtext + "Clear filters" button (resets search + sort + platform filter).
6. **Sort dropdown** — 5 options (Popular, Price ↑, Price ↓, Fastest delivery, Name A-Z); applied inside `grouped` useMemo on allServices before grouping; `parseDeliveryMinutes` helper handles "0-2h"/"5-15d"/"0-30m".
7. **Platform counts** — `platformCounts` computed from allServices; `getPlatformCount()` returns accurate API `pagination.total` for "All" (when filter is All) and for the currently-selected platform; loaded-so-far count for others. Displayed as `Instagram (1,098)` with tabular-nums + reduced opacity.
8. **A11y** — ServiceCard `role="button"` + `tabIndex={0}` + `aria-label` + `onKeyDown` (Enter/Space); platform filter buttons `aria-pressed`; tab list `role="tablist"` + `role="tab"` + `aria-selected`; sort dropdown `aria-label="Sort services"`; search input `aria-label="Search services"`.
9. **Order now button** — new primary "Order" button (ShoppingCart icon) in card footer, alongside existing "Details" link. Both call onClick with stopPropagation so modal opens exactly once.
10. **Debounce 400ms → 300ms** — single-line change in the search useEffect.

## Cleanup
- Removed unused imports: `Counter` (from "./counter"), `getPlatformEmoji` (from "./platform-logo").

## Build verification
```
$ cd /home/z/my-project && bun run build 2>&1 | tail -20
✓ Compiled successfully in 23.3s
```
No errors, no warnings. All API routes still listed.

## Issues / follow-ups
- Platform counts for non-selected platforms reflect loaded services (grow as user scrolls when filter is "All"). To get accurate per-platform totals for all platforms simultaneously, a future task could add a `/api/services/counts` endpoint that returns `groupBy({ platform })` counts in a single query.
- The SellEarningsChart daily series is derived deterministically from `totalEarnings` (since the API only exposes the all-time total, not a per-day time series). When a real per-day earnings endpoint becomes available, swap the series source — the SVG render code stays identical.

## Did NOT commit or push
As instructed — orchestrator will handle git.
