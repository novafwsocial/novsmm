# Task DASHBOARD-3D-ENHANCEMENT-1 — Work Record

**Agent:** full-stack-developer
**Task ID:** DASHBOARD-3D-ENHANCEMENT-1
**Task:** Subtle 3D + motion enhancements for dashboard + admin panel

## Scope

Enhance functional dashboard surfaces (not marketing) with SUBTLE 3D and motion effects:
- Max tilt 3deg (vs 8deg on landing)
- No new npm dependencies
- Performance-first (tables + charts must stay fast)
- Mobile disabled
- prefers-reduced-motion respected
- Don't break tables / forms / modals

## Files Created

- `src/components/novsmm/dash-reveal.tsx` — IntersectionObserver-based 2D scroll reveal wrapper. Mobile short-circuits to immediate show. Observer disconnects after first reveal (one-shot).

## Files Modified

1. `src/app/globals.css` — Appended a "DASHBOARD 3D & MOTION" CSS block at the end:
   - 9 utility classes: `stat-card-3d`, `table-row-hover`, `tab-content-enter`, `dash-reveal`, `btn-press`, `badge-pulse`, `skeleton-shimmer`, `modal-3d-enter`, `chart-container`
   - 4 keyframes: `tabFadeIn`, `badge-pulse-subtle`, `skeleton-shimmer`, `modal3dIn`
   - `@media (max-width: 768px)` block disabling all hover transforms + dash-reveal transition
   - `@media (prefers-reduced-motion: reduce)` block disabling every animation/transition/transform in this system

2. `src/components/novsmm/dashboard-home.tsx`:
   - Imported `DashReveal`
   - Added `stat-card-3d` class to the `StatCard` root div
   - Wrapped stat cards RevealStagger in `<DashReveal>` (top row)
   - Wrapped the chart + wallet + quick-stats grid in `<DashReveal delay={0.05}>` (chart row)
   - Wrapped the recent-orders section in `<DashReveal delay={0.1}>`
   - Added `chart-container` to the revenue AreaChart wrapper div

3. `src/components/novsmm/admin-panel.tsx`:
   - Imported `DashReveal`
   - Wrapped AdminOverview stat cards RevealStagger in `<DashReveal>` and chart row in `<DashReveal delay={0.05}>`
   - Added `stat-card-3d` to the `AdminStat` component's root div className
   - Added `chart-container` to the AdminOverview revenue AreaChart wrapper div
   - Bulk-added `table-row-hover` to all 12 admin table data rows (AdminUsers, AdminServices, AdminOrders, AdminRefunds, AdminWithdrawals, AdminApiKeys, AdminLicenses, AdminCurrencies, AdminLanguages, AdminCoupons, AdminCms, AdminEmailTemplates). Header rows untouched.
   - Bulk-added `btn-press` to 24+ primary action buttons (Add service/provider/payment/key/license/currency/language/coupon/role/promotion/order/content + modal Save buttons + Broadcast now + Save settings + Save & enable OAuth + Publish version + Save template + Save content)
   - Bulk-added `modal-3d-enter` to all 17 admin modal content divs

4. `src/components/novsmm/dashboard-shell.tsx`:
   - Added `btn-press` to the sidebar "Top up" wallet button

## Build Result

✓ PASS
- `bun run build`: Compiled successfully in 30.6s
- TypeScript: passed in 26.4s
- 105/105 static pages generated
- `bun run lint`: broken in this environment (ESLint 10.6.0 / @typescript-eslint/utils incompatibility — same as LANDING-3D-ENHANCEMENT-1). `next build` performs its own TS type-check and passes.

## Design Notes

- All effects are GPU-composited (transform/opacity only) — no per-frame JS, no layout thrash.
- Stat cards: 4px lift + 2deg rotateX on hover (vs 6deg on landing HeroDashboard).
- Charts: 1deg rotateX on hover (vs 15deg rotateX on landing Scroll3DReveal).
- Modals: one-shot 5deg rotateX + scale(0.95) entrance (only fires once on mount).
- Tables: 2px translateX + bg-muted on hover (existing hover:bg-muted/30 retained).
- Buttons: scale(0.97) on :active only — purely tactile feedback, no visual distraction.
- Mobile: every hover/transition effect disabled via @media query; DashReveal component also short-circuits to immediate show on mobile (<768px).
- Accessibility: prefers-reduced-motion: reduce disables every effect in this system.
- Existing framer-motion Reveal/RevealStagger wrappers on dashboard-home + admin-panel preserved underneath DashReveal — layered motion, no conflict (different properties: framer animates opacity/y via inline styles; DashReveal animates via CSS class transitions).

## Issues

None. All effects are CSS-only or IntersectionObserver-based (one-shot, then disconnected). No JS overhead added to runtime beyond a single observer per DashReveal instance. No functional regressions — tables remain sortable/clickable, modals open/close normally, forms submit unchanged.
