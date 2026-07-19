# MARKETPLACE-13-IMPROVEMENTS — work record

Task ID: MARKETPLACE-13-IMPROVEMENTS
Agent: full-stack-developer

## Files modified

- `src/components/novsmm/dashboard-marketplace.tsx` (the main ~1,866-line file grew to ~3,650 lines after all 13 features landed)
- `src/hooks/use-api.ts` (added `useUpdateOfferStatus`, `useAdminRefundOrder`; extended `useOffers` to accept an optional `refetchInterval`)
- `src/app/api/admin/refunds/route.ts` (POST now also accepts an `orderId` and resolves it to the order's sale transaction so admins can refund directly from the history tab)

## Files created

- None (no new files; everything lives in the existing dashboard-marketplace.tsx + use-api.ts + admin/refunds route).

## 13 features shipped

### Batch 1 (items 6–10)

6. **Compare Services** — added a Compare toggle button (bottom-left of each ServiceCard / list row). Comparison list lives in BuyTab component state (max 3, soft cap that drops the oldest). A floating `CompareBar` appears at the bottom of the viewport when 2+ are selected; clicking it opens a `CompareModal` showing Name / Platform / Price / Delivery time / Min-Max / Quality side-by-side, with per-column remove buttons. `Clear` button resets the tray.

7. **Price Filter** — added a min/max price row below the category filters with an `Apply` button. Filter is applied client-side inside the `grouped` useMemo (alongside favorites). Active filter shows a `Price: $X – $Y` chip with an X to clear. Reset by `Clear filters` too.

8. **Trending** — added a `TrendingSection` at the very top of BuyTab (before search). Shows 6 mini-cards in a horizontal scroller, sorted by ascending service ID (oldest = most established). Each mini card shows platform emoji, truncated name, price, and an Order button. Clicking opens the same ServiceDetailModal.

9. **Reviews/Ratings** — added `useReviews` hook (localStorage key `novsmm_reviews`, shape `{ [serviceId]: { rating: runningAvg, count } }`, online-mean update so storage stays tiny). ServiceCard shows `★ 4.5 (12)` summary in the bottom-right when a rating exists. ServiceDetailModal shows the current rating as 5 stars + a "Rate this service" picker with hover/focus state. Submitting fires a "Thanks for rating!" toast.

10. **List View / Grid View toggle** — added `useViewMode` hook (localStorage key `novsmm_view_mode`, defaults to `grid`). Segmented control next to the sort dropdown. Grid view = existing 3-column card layout. List view = compact `ServiceListRow` rows in a table with the `table-row-hover` class, showing more services per screen. Both views share the same compare/favorites/rating affordances.

### Batch 2 (items 11–18)

11. **Export Orders (CSV)** — added an "Export CSV" button in the HistoryTab header next to the status filter. Generates RFC-4180-quoted CSV from the current `filteredOrders` (so status + search filters are respected). Vanilla `Blob` + `URL.createObjectURL` + temporary `<a>` — no external libs. Filename: `novsmm-orders-YYYY-MM-DD.csv`. Disabled when there are no orders.

12. **Pause/Activate Offer** — added a `Pause`/`Activate` toggle button on each offer row in SellTab. Calls the existing PATCH /api/offers endpoint with `{ id, status }` via the new `useUpdateOfferStatus` hook. Paused rows are dimmed (`opacity-50`) and show an amber "Paused" badge. Public offers route already filters by `status: "active"`, so paused offers are hidden from buyers automatically.

13. **Per-Offer Statistics** — added a `Stats` button on each offer row that opens a small `OfferStatsModal` showing Total sales, Total revenue (uses `o.earnings`, falls back to `sales × (price − cost)` when 0), Margin per sale, Date published, and Status. Cost/Price/margin summary footer.

14. **Bulk Publish Offers** — added a "Bulk publish" button next to "Publish offer". Opens a `BulkPublishModal` with: search + multi-select checkbox list of services, a markup % input (default 150%), live preview of calculated prices, and a "Publish N offers" button that calls `useCreateOffer.mutateAsync` sequentially with progress UI ("Publishing 3/10…"). Reports success/failure counts in a toast at the end.

15. **Suggested Price** — inside the Publish/Edit offer modal, when a service is selected, shows an amber-tinted hint with `💡 Suggested price: $X.XX (150% markup)` (calculated as cost × 2.5), a "Use suggested" button that fills the price input, and the NOVSMM catalog competitor price for reference.

16. **Sale Notification** — SellTab passes `SALE_POLL_INTERVAL` (30s) to `useOffers` so React Query auto-refetches every 30s while SellTab is mounted (and only then — no waste on other tabs). A `useEffect` watches `offersData.totalSales` and, on increase, fires a `🎉 You made a sale!` toast with the revenue gain and the offer name. Previous totals are tracked in refs.

17. **Search Order by ID** — added a search input in the HistoryTab header. 300ms debounce (same pattern as BuyTab search). Filters by `publicId`, `serviceName`, or `platform`. Works alongside the status filter (both conditions must match). Shows `No orders match "X"` empty state when no results.

18. **Refund from History** — added Cancel and Refund buttons on history rows:
    - **Cancel** (non-admin, within 60s of placement, status pending/processing): opens a red confirmation dialog, calls PATCH /api/orders with `{ orderId }` (existing cancel endpoint).
    - **Refund** (admin only, status completed): opens an amber confirmation dialog, calls POST /api/admin/refunds with `{ orderId }`. The admin/refunds route was extended to accept `orderId` and resolve it to the order's sale transaction.
    - Both close on success and the orders list refreshes via React Query invalidation.

## Build result

**PASS** — `bun run build` clean: `✓ Compiled successfully in 24.3s`, `✓ TypeScript in 18.3s`, `✓ 109/109 static pages generated`. No errors, no new warnings. No new npm dependencies.

## Constraints honored

- ✅ No new npm dependencies (only used lucide-react icons, React, TanStack Query, shadcn primitives already installed)
- ✅ No framer-motion (CSS-only animations: `stat-card-3d`, `btn-press`, `modal-3d-enter`, `tab-content-enter`, `table-row-hover` from globals.css)
- ✅ Existing 5 improvements from MARKETPLACE-5-IMPROVEMENTS still work (category filter, edit offer, history status filter, favorites, history pagination) — untouched
- ✅ Mobile-first: all new UIs are responsive (horizontal scroll on trending, stacked layouts on small screens, safe-area insets on CompareBar, hidden columns on list view at sm/md breakpoints)
- ✅ Used existing CSS classes from globals.css (no new CSS added)
- ✅ Same visual design language (same pill buttons, same modal style, same color tokens)
- ✅ localStorage for features that need persistence (reviews, view mode) — no DB migrations
- ✅ Build passes

## Issues / notes

- The original task spec said `POST /api/orders/[id]/cancel` for the cancel path, but the actual existing route is `PATCH /api/orders` with body `{ orderId }`. Used the existing route (the existing `useCancelOrder` hook already wraps it correctly).
- For admin refund from history, the existing `POST /api/admin/refunds` route expected a `transactionId`. Extended it to ALSO accept `orderId` and resolve the order's sale transaction internally — no breaking change to existing callers.
- The sale-notification polling (#16) uses React Query's `refetchInterval` parameter (now supported by `useOffers`). This means polling only runs while SellTab is mounted — when the user is on Buy or History, no offers refetches happen.
- The Cancel button only shows for non-admins within 60s (and only on pending/processing orders). The Refund button only shows for admins on completed orders. Both are deliberately distinct (different colors, different icons) to avoid user confusion.
