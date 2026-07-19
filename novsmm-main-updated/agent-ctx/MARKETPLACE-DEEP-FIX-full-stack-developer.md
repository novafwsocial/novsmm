# MARKETPLACE-DEEP-FIX — full-stack-developer

## Task
Deep fix of the NOVSMM Marketplace (`src/components/novsmm/dashboard-marketplace.tsx`).
The user reported that the marketplace "doesn't let them do anything" — services
don't render, the page is broken. Agent-browser audit confirmed the API returns
24 services correctly but the UI shows "Showing 0 of 6,390 services".

## Files modified
- `src/components/novsmm/dashboard-marketplace.tsx` (3,677 → 3,685 lines; net code
  reduced even though line count grew slightly due to longer explanatory comments)

## Root cause of the rendering bug

The bug was in the data flow between `useServices` → `useEffect` →
`setAllServices` → `grouped` → render. There were **two** interacting defects:

### Defect #1 (PRIMARY — the "0 of N services" bug)

The 300 ms search-debounce `useEffect [search]` ran on the **initial mount**
(just like every useEffect does), scheduling a timeout that called
`setAllServices([])` and `processedPagesRef.current.clear()`.

Timeline:
- t=0   — component mounts; `useServices({ page: 1 })` starts fetching; the
  debounce effect schedules a 300 ms timeout.
- t≈100 — API responds with 24 services; the `useEffect [data, page]` runs,
  populates `allServices` with the 24 services. UI briefly shows them.
- t=300 — the debounce timeout fires and calls `setAllServices([])`,
  clearing the just-loaded services. Because `data` and `page` didn't change
  (the response is cached), the data effect never re-ran to repopulate.
- result — `allServices` stayed empty, UI showed "0 of 6,390 services".

### Defect #2 (secondary — stale-page contamination on pagination / filter change)

`useServices` uses `placeholderData: (prev) => prev`, so when the query key
changes (page change, platform change, category change, debounced-search
change), `data` is still the **previous** query's data while the new fetch is
in flight. The data effect ran on the `page` change, saw `processedPagesRef`
didn't yet contain the new page, and merged the **stale** services into
`allServices` — then marked the page as processed, so the real (new) data was
ignored when it arrived. This manifested as duplicate / wrong-platform
services after filtering, and could also leave the catalog empty if the stale
data happened to be from a different platform.

## Fixes applied

### Fix #1 — skip the debounce clear on the initial mount
Added a `skipFirstSearchRef` that bails out of the debounce effect on the very
first run (mount). Subsequent `search` changes still trigger the 300 ms
debounce + clear as before. This is the surgical fix for defect #1.

### Fix #2 — `isPlaceholderData` guard in the data-accumulation effect
Destructured `isPlaceholderData` from `useServices` and added two guards to
the data effect:
1. `if (isPlaceholderData) return;` — wait for the real (current-query) data
   instead of merging the previous query's stale `data.services`.
2. `if (data.pagination?.page !== page) return;` — defence-in-depth: never
   merge a payload whose page doesn't match the requested page.

Together these guarantee that `allServices` only ever contains services that
correspond to the **current** `platformFilter` / `categoryFilter` /
`debouncedSearch` / `page`, even though `useServices` keeps the old `data`
reference alive while refetching.

### Cleanup
- Removed the dead `platformCounts` `useMemo` (lines 556–562 in the original).
  It was computed from `allServices` but never read — `getPlatformCount` uses
  the server-provided `countsData.counts` instead.
- Removed the ghost `onRepeat` prop from `HistoryTab` (it was passed as
  `() => {}` from the parent and never referenced inside the component —
  internal repeat logic uses `repeatOrder.mutate({ orderId: o.id })` directly).
- Moved the `processedPagesRef` declaration above the debounce effect that
  references it (it worked before because refs are accessed at runtime, but
  the ordering was misleading).
- Removed the now-misleading NOTE comment that referenced a "race condition"
  — the race it described was actually defect #1, now fixed at the root.
- Removed the unnecessary `// eslint-disable-next-line react-hooks/set-state-in-effect`
  pragma (the rule it suppressed isn't in the ESLint config and the pattern is
  a legitimate React idiom).

## All 18 features verified intact
1. Category filter — `handleCategoryChange` unchanged ✓
2. Edit offer — SellTab publish/edit modal unchanged ✓
3. History status filter — HistoryTab status dropdown unchanged ✓
4. Favorites — `useFavorites` + star toggle unchanged ✓
5. History pagination — HistoryTab pagination footer unchanged ✓
6. Compare services — `toggleComparison` + CompareBar/CompareModal unchanged ✓
7. Price filter — `applyPriceFilter` / `clearPriceFilter` unchanged ✓
8. Trending — `trendingServices` useMemo + TrendingSection unchanged ✓
9. Reviews — `useReviews` + rating UI unchanged ✓
10. List/grid view — `useViewMode` + segmented control unchanged ✓
11. Export CSV — `exportCsv` unchanged ✓
12. Pause/activate offer — `handleTogglePause` unchanged ✓
13. Per-offer stats — OfferStatsModal unchanged ✓
14. Bulk publish — BulkPublishModal unchanged ✓
15. Suggested price — publish-modal suggested-price hint unchanged ✓
16. Sale notification — SellTab totalSales watcher unchanged ✓
17. Search order by ID — HistoryTab search input unchanged ✓
18. Refund from history — Cancel/Refund confirmation dialog unchanged ✓

## Build result
- `bun run build` — **PASS** (✓ Compiled successfully in 22.5s; TypeScript
  finished in 17.8s with no errors; 109/109 static pages generated).
- `bun run lint` — pre-existing ESLint config error (TypeError in
  @typescript-eslint/utils) unrelated to this change; not introduced by this
  task.

## Constraints honoured
- NO new npm dependencies.
- NO framer-motion.
- NO recharts (the existing pure-SVG `SellEarningsChart` was already
  recharts-free; untouched).
- All 18 features preserved.
- Build passes.
- Mobile-first layout preserved.
- API integration (`/api/services`, `/api/services/counts`, `/api/offers`,
  `/api/orders`, `/api/admin/refunds`) unchanged.
