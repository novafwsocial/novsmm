# MARKETPLACE-5-IMPROVEMENTS — full-stack-developer

## Task
Implement 5 improvements to the NOVSMM Marketplace dashboard:
1. Filter by category in Buy tab
2. Edit offer in Sell tab
3. Filter history by status
4. Favorites/wishlist
5. Pagination in history tab

## Files modified
- `src/components/novsmm/dashboard-marketplace.tsx` (1,603 → 1,866 lines)
- `src/hooks/use-api.ts` (useServices hook now accepts `category` param)

## Files created
- None (useUpdateOffer hook already existed; PATCH /api/offers route already existed; /api/services already accepted `category` query param).

## Constraints honoured
- NO new npm dependencies (only used existing react + lucide-react APIs).
- NO framer-motion (CSS animations only — reused stat-card-3d, btn-press, modal-3d-enter, tab-content-enter).
- All existing functionality preserved: BuyTab infinite scroll + drip-feed modal + mass-order modal; SellTab publish/remove + earnings chart; HistoryTab repeat + summary cards.
- Mobile-first: every new UI element has sm:/lg: breakpoints.
- Same visual design language (rounded-full pills, min-h-[44px] touch targets, text-xs labels, nov-scroll, tabular-nums).

## Implementation details per improvement

### #1 Category filter
- New `CATEGORY_FILTERS` constant with the 10 categories from the spec.
- New `categoryFilter` state in BuyTab, defaults to "All".
- New `handleCategoryChange()` mirrors the existing `handlePlatformChange()` reset pattern (clears allServices, expandedPlatforms, processedPagesRef).
- Second filter row below platform filters, slightly smaller pills (min-h-[36px] vs 44px, text-xs vs text-sm, bg-foreground/bg-background active state to visually distinguish from platform filters).
- `useServices` hook updated in src/hooks/use-api.ts to accept `category` param, append it to URLSearchParams (skipping "All"), and include it in the queryKey.
- clearFilters() now also resets categoryFilter.

### #2 Edit offer
- `useUpdateOffer` hook already existed in use-api.ts (line ~866) → just imported it.
- PATCH /api/offers already existed at src/app/api/offers/route.ts (lines 93-116) and already accepts `{ id, price }` → no API changes needed.
- New `editingOffer` state holds the offer being edited (or null).
- New `openEditModal(offer)` pre-fills `selectedService` and `price` from the offer and sets `editingOffer`.
- New `closeModal()` + `resetModalState()` helpers to clear modal state cleanly.
- `handlePublish()` now branches: if `isEditing`, calls `updateOffer.mutateAsync({ id, price })`; otherwise calls `createOffer.mutateAsync({ serviceId, price })`.
- Modal title: "Edit offer" / "Publish offer" depending on mode.
- Modal description: different copy for edit vs create.
- Modal service select: `disabled={isEditing}` (can't change service when editing — only the price is mutable per the PATCH API).
- Modal submit button: "Save changes" / "Publish offer" / "Saving…" / "Publishing…" depending on mode + pending state.
- Margin preview in edit mode falls back to `editingOffer.cost` if the service isn't in the loaded services list (defensive — e.g. service paused since offer was created).
- Added Pencil icon "Edit" button next to "Remove" in the offers table action column, wrapped in a flex container with gap-1.5.
- "Publish offer" header button now calls `resetModalState()` first so a previous edit doesn't leak into a new publish.

### #3 History status filter
- New `HISTORY_STATUS_OPTIONS` constant (6 options: all / processing / in_progress / completed / partial / cancelled).
- New `statusFilter` state in HistoryTab, defaults to "all".
- `filteredOrders` useMemo filters the orders array client-side (no API change needed).
- Status filter dropdown placed in the table header row, full-width on mobile, 180px on sm+ screens. Same ArrowUpDown + ChevronRight icon visual as the BuyTab sort dropdown.
- "Showing X of Y orders" line appears below the header when a filter is active.
- Empty state differentiates "no orders at all" vs "no orders match this filter".
- Summary cards always reflect ALL orders (not filtered) so the user's totals don't change when filtering.

### #4 Favorites/wishlist
- New `useFavorites()` hook defined at the top of dashboard-marketplace.tsx. Uses localStorage key `novsmm_favorites`. Returns `{ favorites: Set<string>, toggleFavorite }`. useCallback-stabilized toggle. Loads from localStorage on mount in useEffect (SSR-safe with `typeof window !== "undefined"` guard).
- New `showFavoritesOnly` state in BuyTab.
- `grouped` useMemo now filters `allServices` to favorited IDs first when `showFavoritesOnly` is true (intersection of loaded services + favorites — works correctly even when a platform/category filter is also active).
- New "Favorites" toggle pill at the end of the platform filter row. Uses amber-400 background when active (clearly distinct from the primary-blue platform pills). Shows total favorites count when > 0. Star icon uses `fill-current` when active.
- ServiceCard now accepts `isFavorite` + `onToggleFavorite` props. Renders an absolutely-positioned star button at top-right (right-3 top-3, h-8 w-8 touch target). stopPropagation on click so the card's onClick (open detail modal) doesn't fire. Filled amber when favorited, muted-foreground outline otherwise.
- Title/description block in ServiceCard now has `pr-8` so it doesn't overlap with the absolute star.
- Quality badge moved to `mt-0.5` so it visually balances with the star above it.
- clearFilters() now also resets showFavoritesOnly.

### #5 History pagination
- New `HISTORY_PAGE_SIZE = 15` constant.
- New `historyPage` state in HistoryTab.
- `pagedOrders` useMemo slices the filtered array.
- `safePage` clamps the current page to totalPages (handles edge cases where orders were removed server-side while a filter was active).
- useEffect resets historyPage to 1 when statusFilter changes.
- Pagination footer (only visible when totalPages > 1) shows "Page X of Y · Showing Z of N orders" + Prev/Next buttons. Stacks vertically on mobile, horizontal on sm+. Prev disabled on page 1, Next disabled on last page.

## Build verification
```
$ cd /home/z/my-project && bun run build 2>&1 | grep -E "✓|✗|error|warn"
✓ Compiled successfully in 24.7s
✓ Generating static pages using 1 worker (109/109) in 417ms
```
No errors. No warnings. All 109 static pages generated.

## Issues / follow-ups
- None. All 5 improvements are functional and the build is clean.
- The favorites data is device-local (localStorage only) as specified — no API/sync. If cross-device favorites are needed later, a new `/api/favorites` endpoint + useFavorites hook swap would be the path forward, but the contract (Set<string> of service IDs + toggle) stays the same.
- The category filter pills don't show counts (per spec — "just the buttons, simpler, faster"). If counts are wanted later, the `/api/services/counts` endpoint could be extended to group by category in a single query.

## Did NOT commit or push
As instructed — orchestrator will handle git.
