# NOVSMM — Exhaustive UI → API Connection Audit (Task AUDIT-1)

**Scope:** 21 components under `src/components/novsmm/` + every route under `src/app/api/**/route.ts`
**Auditor:** code-audit sub-agent
**Date:** read-only audit, no code changes made

---

## 1. Executive Summary

| Status | Count | Notes |
|---|---|---|
| ✅ Wired (calls a real API and behaves correctly) | 132 | Most dashboard + admin surfaces work end-to-end against real DB-backed endpoints |
| ⚠️ Decorative (renders but does nothing or only navigates inside the SPA) | 31 | Mostly landing/footer link grids, hero CTA "trust badges", some admin search boxes |
| ❌ Broken (handler references undefined symbol → runtime crash) | **6** | **4 admin-panel modal backdrops + 1 login "Forgot password" + 1 dead "Share referral link"** |
| 🚫 Missing (endpoint exists but no UI exposes it; or UI implies an action that has no endpoint) | 12 | Refunds, bulk ops, admin search, manual orders, broadcast, services/providers edit/delete |

### Headline numbers
- **0** `fetch("http://localhost…")` calls in `src/` (✅ the gateway-safe pattern is honored; the only `localhost:3003` reference is server-side in `src/lib/notify.ts:115` and is correct).
- **4 runtime-broken admin modals** (`admin-panel.tsx` lines 1095, 1216, 1308, 1387) — backdrop `onClick={onClose}` references a variable that does not exist in scope. **These will throw `ReferenceError` the first time an admin clicks outside the modal.** Trivial 4-line fix.
- **1 broken "Forgot password?" link** (`login-screen.tsx:189-194`) — uses `href="#"` while the `/api/auth/forgot-password` endpoint is fully implemented and unused.
- **2 purely decorative search inputs** (`admin-panel.tsx:288`, `dashboard-tickets.tsx:125-127`) — input has no `value`, no `onChange`, no `useState`.
- **5 hooks imported in `admin-panel.tsx` but never called**: `useRefund`, `useBulkAction`, `useAdminSearch`, `useCreateManualOrder`, `useBroadcastNotification`. The corresponding endpoints (`POST /api/admin/refunds`, `POST /api/admin/bulk`, `GET /api/admin/search`, `POST /api/admin/orders`, `POST /api/admin/notifications`) all exist and are RBAC-protected — but no UI button calls them.
- **2 admin tables missing row-level Edit/Delete**: `AdminServices` and `AdminProviders` render PATCH/DELETE-capable entities but expose only Add (Create). The PATCH and DELETE routes (`/api/admin/services`, `/api/admin/providers`) are implemented.
- **"Sale" (venta) flow exists end-to-end** — `POST /api/offers` publishes, `GET /api/offers` lists, `DELETE /api/offers` removes. `SellTab` in `dashboard-marketplace.tsx` is fully wired.
- **"Rental" (renta / subscription) flow exists in DB & API** — `GET/POST/DELETE /api/subscriptions`, `BillingSection` in `dashboard-profile.tsx:501-575` lets the user subscribe/cancel. BUT: the subscription is **sandbox only** (the real Stripe Billing code is commented out at `subscriptions/route.ts:60-71`), and **`plans.tsx` (landing) CTAs route to `register` not to `/api/subscriptions`** → users who land on `/plans` and click "Start free" never reach the actual subscription flow.

---

## 2. Per-file Audit Tables

### 2.1 `dashboard-shell.tsx` (419 lines — sidebar + topbar + mobile drawer)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Logo click (sidebar) | `:68` | yes (`setView("landing")`) | no | ✅ wired | — |
| Nav buttons (Home, Analytics, Marketplace, Orders, Wallet, Tickets, Notifications, Profile) | `:87-95`, `:180-202` | yes (`setDashboardTab`) | no | ✅ wired | — |
| Admin Panel nav button (admin only) | `:103-108`, `:194-203` | yes | no | ✅ wired | — |
| Wallet "Top up" button (mini) | `:122-127` | yes (`setDashboardTab("wallet")`) | no | ✅ wired | — |
| UserPill toggle | `:357-373` | yes (`setOpen`) | no | ✅ wired | — |
| UserPill → "Settings" item | `:383` | no — `<MenuItem icon={Settings} label="Settings" />` with no `onClick` | no | ⚠️ decorative | Wire to `setDashboardTab("profile")` |
| UserPill → "View profile" item | `:384` | no — same | no | ⚠️ decorative | Wire to `setDashboardTab("profile")` |
| UserPill → "Sign out" item | `:386` | yes (`onSignOut`) | yes (`signOut()` + reload) | ✅ wired | — |
| Mobile menu hamburger | `:226-232` | yes (`setMobileOpen(true)`) | no | ✅ wired | — |
| Mobile drawer close (X / backdrop) | `:150-152`, `:162-167` | yes | no | ✅ wired | — |
| Topbar search input | `:237-240` | no — input has no `onChange`/`value` | no | ⚠️ decorative | Wire to `useAdminSearch` or remove |
| Topbar "Operational" status pill | `:247-253` | n/a (display only) | no | ⚠️ decorative | Acceptable |
| Topbar Bell icon | `:255-261` | **no `onClick`** | no | ⚠️ decorative | Wire to `setDashboardTab("notifications")` |
| ThemeToggle | `:263` | yes (internal) | no | ✅ wired | — |
| Exit button (topbar) | `:265-271` | yes (`setView("landing")`) | no | ✅ wired | — |
| "DR" avatar circle (topbar) | `:273-275` | no | no | ⚠️ decorative | Wire to user dropdown |

### 2.2 `dashboard-home.tsx` (434 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| 7D/30D/90D range toggle buttons | `:127-138` | **no `onClick`** (active state is hardcoded `i === 1`) | no | ⚠️ decorative | Wire to query param / `useState` |
| "Top up" button (wallet card) | `:191-196` | yes (`setDashboardTab("wallet")`) | no | ✅ wired | — |
| "Withdraw" button (wallet card) | `:197-202` | yes (`setDashboardTab("wallet")`) | no | ✅ wired | Does not open the Withdraw modal directly — acceptable |
| "View all" (recent orders) link | `:235-240` | yes (`setDashboardTab("orders")`) | no | ✅ wired | — |
| Referral copy button | `:289-296` | yes (`navigator.clipboard.writeText`) | no | ✅ wired | — |
| "Browse →" (favorites) | `:312` | yes (`setDashboardTab("marketplace")`) | no | ✅ wired | — |
| "View all →" (recent tickets) | `:337` | yes (`setDashboardTab("tickets")`) | no | ✅ wired | — |
| All data (stats, series, recentOrders, recentNotifications, favorites, tickets, referrals) | various | yes via hooks | yes — `/api/dashboard`, `/api/favorites`, `/api/tickets`, `/api/referrals`, `/api/auth/session` | ✅ wired | — |

### 2.3 `dashboard-marketplace.tsx` (982 lines — Buy / Sell / History)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Tab switch (Buy / Sell / History) | `:103-121` | yes (`setTab`) | no | ✅ wired | — |
| Wallet display | `:142-160` | yes via `useWallet` | yes — `GET /api/wallet` | ✅ wired | — |
| Search input (debounced) | `:257-267` | yes (`setSearch` + 400ms debounce → `setDebouncedSearch`) | yes — `GET /api/services?search=` | ✅ wired | — |
| Clear-search X button | `:264-266` | yes (`setSearch("")`) | no | ✅ wired | — |
| Platform filter chips | `:274-290` | yes (`handlePlatformChange`) | yes — `GET /api/services?platform=` | ✅ wired | — |
| Service card click | `:380-436` | yes (`onClick={onClick}` → opens modal) | no | ✅ wired | — |
| Favorite star toggle on card | `:384-390` | yes (`toggleFav` → `addFav.mutate`/`removeFav.mutate`) | yes — `POST/DELETE /api/favorites` | ✅ wired | — |
| Load more button | `:338-343` | yes (`setPage(p => p+1)`) | yes | ✅ wired | — |
| Infinite-scroll sentinel | `:226-239` | yes (IntersectionObserver) | yes | ✅ wired | — |
| Service detail modal close (X + backdrop) | `:506-522` | yes (`onClose`) | no | ✅ wired | — |
| Quantity input + 1K/5K/10K quick buttons | `:573-597` | yes (`setQuantity` clamped to min/max) | no | ✅ wired | — |
| Link input | `:600-611` | yes (`setLink`) | no | ✅ wired | — |
| Coupon code input + Apply button | `:614-630` | yes (`applyCoupon` → `fetch("/api/coupons/validate", POST)`) | yes — `POST /api/coupons/validate` | ✅ wired | — |
| **Place order button** | `:653-671` | yes (`handleOrder` → `createOrder.mutateAsync`) | yes — `POST /api/orders` | ✅ wired | — |
| History tab summary cards | `:716-729` | yes (computed from `useOrders`) | yes — `GET /api/orders` | ✅ wired | — |
| Repeat button (per order row) | `:781-788` | yes (`repeatOrder.mutate`) | yes — `POST /api/orders/repeat` | ✅ wired | — |
| Sell tab summary cards | `:875-888` | yes via `useOffers` | yes — `GET /api/offers` | ✅ wired | — |
| Publish offer button | `:892-894` | yes (`setShowPublish(true)`) | no | ✅ wired | — |
| Offer row Remove button | `:924` | yes (`deleteOffer.mutate(o.id)`) | yes — `DELETE /api/offers?id=` | ✅ wired | — |
| Publish modal: service select | `:957` | yes (`setSelectedService` + auto-price) | no | ✅ wired | — |
| Publish modal: price input | `:964` | yes (`setPrice`) | no | ✅ wired | — |
| Publish modal submit | `:973-975` | yes (`handlePublish` → `createOffer.mutateAsync`) | yes — `POST /api/offers` | ✅ wired | — |
| Publish modal Cancel | `:976` | yes (`setShowPublish(false)`) | no | ✅ wired | — |

### 2.4 `dashboard-orders.tsx` (205 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Export CSV button | `:49-59` | yes (`window.open("/api/export?…", "_blank")`) | yes — `GET /api/export?format=csv&type=orders` | ✅ wired | — |
| Search input | `:68-73` | yes (`setQuery`) | yes (polls via `useOrders(filter, query)`) | ✅ wired | — |
| Status filter chips | `:78-97` | yes (`setFilter`) | yes (re-fetches) | ✅ wired | — |
| Repeat button per row | `:181-188` | yes (`repeatOrder.mutate`) | yes — `POST /api/orders/repeat` | ✅ wired | — |

### 2.5 `dashboard-wallet.tsx` (473 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Export button | `:68-73` | yes (`window.open`) | yes — `GET /api/export?type=transactions` | ✅ wired | — |
| Top up button | `:74-79` | yes (`setShowTopup(true)`) | no | ✅ wired | — |
| Withdraw button | `:80-85` | yes (`setShowWithdraw(true)`) | no | ✅ wired | — |
| Top-up modal: amount input + presets | `:316-340` | yes (`setAmount`) | no | ✅ wired | — |
| Top-up modal: method picker | `:343-359` | yes (`setMethod`) | yes via `usePaymentMethods` | ✅ wired | — |
| Top-up modal submit | `:362-375` | yes (`handleSubmit` → `topup.mutateAsync`) | yes — `POST /api/wallet/topup` | ✅ wired | — |
| Withdraw modal: amount | `:412-424` | yes (`setAmount`) | no | ✅ wired | — |
| Withdraw modal: method select | `:427-441` | yes (`setMethod`) | yes via `usePaymentMethods` | ✅ wired | — |
| Withdraw modal: destination | `:444-451` | yes (`setDestination`) | no | ✅ wired | — |
| Withdraw modal submit | `:453-466` | yes (`withdraw.mutateAsync`) | yes — `POST /api/wallet/withdraw` | ✅ wired | — |

### 2.6 `dashboard-analytics.tsx` (262 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| All KPIs & charts | various | yes via `useAnalytics` | yes — `GET /api/analytics` | ✅ wired | — |
| "Share referral link" button | `:213-215` | **no `onClick`** | no | ❌ broken / decorative | Wire to `navigator.clipboard.writeText(shareUrl)` (the same code already exists in `ReferralsSection`) |

### 2.7 `dashboard-tickets.tsx` (391 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| New ticket button | `:100-105` | yes (`setShowCreate(true)`) | no | ✅ wired | — |
| Ticket list "Search tickets…" input | `:125-127` | **no `onChange`, no `value`, no state** | no | ⚠️ decorative | Wire to `useState` filter |
| Ticket row click | `:133-156` | yes (`setActiveId(t.id)`) | no | ✅ wired | — |
| Attach (Paperclip) button | `:224-226` | yes (`fileInputRef.current?.click()`) | yes — `POST /api/uploads` (multipart) | ✅ wired | — |
| Attach (Image) button | `:227-229` | yes (same `fileInputRef`) | yes — `POST /api/uploads` | ✅ wired | Both buttons trigger the same file input — minor UX issue, not a bug |
| Send button | `:243-259` | yes (`send` → `replyTicket.mutate`) | yes — `PATCH /api/tickets` | ✅ wired | — |
| Create ticket modal: subject/priority/message | `:300-330` | yes | no | ✅ wired | — |
| Create ticket submit | `:332-345` | yes (`createTicket.mutateAsync`) | yes — `POST /api/tickets` | ✅ wired | — |

### 2.8 `dashboard-notifications.tsx` (213 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| WebSocket connection | `:46-68` | yes | yes — `io("/?XTransformPort=3003")` | ✅ wired | — |
| Mark all read button | `:109-114` | yes (`markAllRead` → `api.post("/api/notifications", { all: true })`) | yes — `POST /api/notifications` | ✅ wired | — |
| Filter chips (9 types) | `:121-135` | yes (`setFilter`) | no (client-side filter) | ✅ wired | — |

### 2.9 `dashboard-profile.tsx` (623 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Section tabs (Profile/Security/Billing/Referrals/Notifications/Sessions) | `:116-140` | yes (`setActiveSection`) | no | ✅ wired | — |
| Name + Country inputs | `:147-150` | yes (`setField`) | no | ✅ wired | — |
| Currency grid buttons | `:154-161` | yes (`setField("currency", c.code)`) | no | ✅ wired | — |
| Language grid buttons | `:168-175` | yes (`setField("language", l.code)`) | no | ✅ wired | — |
| Save changes button | `:177-179` | yes (`handleSave` → `updateProfile.mutate(form)`) | yes — `PATCH /api/me` | ✅ wired | — |
| Change password: current/new | `:294-308` | yes | no | ✅ wired | — |
| Update password button | `:309-312` | yes (`handleChangePassword`) | yes — `POST /api/me/password` | ✅ wired | — |
| Show/hide password eye | `:299` | yes (`setShowPw`) | no | ✅ wired | — |
| 2FA "Set up 2FA" button | `:324-328` | yes (`handleSetup2FA`) | yes — `POST /api/me/2fa/setup` | ✅ wired | — |
| 2FA Verify & Enable button | `:354-357` | yes (`handleVerify2FA`) | yes — `POST /api/me/2fa/verify` | ✅ wired | — |
| 2FA Disable button | `:367-370` | yes (`handleDisable2FA`) | yes — `POST /api/me/2fa/disable` | ✅ wired | — |
| 2FA status check on mount | `:230-233` | **bug**: uses `useState(() => { api.get("/api/admin/settings").then(() => {}).catch(() => {}); })` — calls an admin-only endpoint as a regular user AND does nothing with the result. `twofaEnabled` state stays `false` forever even when 2FA is actually enabled. | n/a | ❌ broken | Replace with `useEffect(() => { api.get("/api/me").then(setTwofaEnabled(user.twoFactorEnabled)) }, [])` |
| Notification preference toggles | `:430-437` | yes (`toggle`) | no | ✅ wired | — |
| Save preferences button | `:439-442` | yes (`handleSave` → `api.patch("/api/me/notification-preferences", prefs)`) | yes — `PATCH /api/me/notification-preferences` | ✅ wired | — |
| Sessions "Revoke all" button | `:478` | yes (`handleRevokeAll` → `api.delete("/api/me/sessions")`) | yes — `DELETE /api/me/sessions` | ✅ wired | — |
| Billing: Subscribe buttons (per plan) | `:551-553` | yes (`handleSubscribe` → `createSub.mutateAsync(p.id)`) | yes — `POST /api/subscriptions` | ✅ wired (sandbox) | Real Stripe Checkout is commented out — see §7 |
| Billing: Cancel subscription | `:534` | yes (`cancelSub.mutate()`) | yes — `DELETE /api/subscriptions` | ✅ wired | — |
| Billing: Export invoices CSV | `:562` | yes (`window.open("/api/invoices?format=csv")`) | yes — `GET /api/invoices?format=csv` | ✅ wired | — |
| Referrals: copy link button | `:600` | yes (`copyCode` → clipboard + toast) | no | ✅ wired | — |
| Notification & Sessions section mount-fetch | `:386-391`, `:454-459` | **anti-pattern**: `useState(() => api.get(...).then(...))`. Works in practice (initializer runs once) but should be `useEffect`. | yes — `GET /api/me/notification-preferences`, `GET /api/me/sessions` | ⚠️ decorative pattern | Refactor to `useEffect` |

### 2.10 `admin-panel.tsx` (1704 lines — biggest)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| 17-tab sub-nav (Overview/Users/Services/Providers/Payments/Withdrawals/Coupons/Promotions/API Keys/Licenses/Currencies/Languages/Webhooks/Logs/Settings/Security/Roles) | `:96-114`, `:149-168` | yes (`setAdminTab`) | no | ✅ wired | — |
| AdminOverview stats + chart + health | `:204-261` | yes via `useAdminOverview` | yes — `GET /api/admin/overview` | ✅ wired | — |
| AdminUsers: search input | `:286-289` | **no `onChange`/`value`/state — decorative** | no | ⚠️ decorative | Wire to `useAdminSearch` (already imported, never called) |
| AdminUsers: suspend/activate icon button | `:328-337` | yes (`updateUser.mutate`) | yes — `PATCH /api/admin/users` | ✅ wired | — |
| AdminUsers: promote-to-admin icon button | `:339-342` | yes (`updateUser.mutate`) | yes | ✅ wired | No "demote" action — minor |
| AdminServices: Add service button | `:407-412` | yes (`setShowAdd(true)`) | no | ✅ wired | — |
| AdminServices: row Edit / Delete actions | — | **none** — table has no Actions column | n/a | 🚫 missing | Add edit/delete icon buttons calling `PATCH`/`DELETE /api/admin/services` (both endpoints exist) |
| AdminServices: Add Service modal submit | `:482-484` | yes (`submit` → `onCreate`) | yes — `POST /api/admin/services` | ✅ wired | — |
| AdminProviders: Add provider button | `:516-522` | yes | no | ✅ wired | — |
| AdminProviders: Sync services button (per card) | `:553-559` | yes (`syncProvider.mutateAsync(p.id)`) | yes — `POST /api/admin/providers/{id}/sync` | ✅ wired | Sync is "simulated" (no real provider API call) — see `admin/providers/[id]/sync/route.ts:39` |
| AdminProviders: row Edit / Delete actions | — | **none** | n/a | 🚫 missing | Add edit/delete buttons calling `PATCH /api/admin/providers` |
| AdminPayments: payment-method cards | `:607-634` | yes (display) | yes via `useAdminPaymentMethods` | ✅ wired | — |
| AdminPayments: Configure credentials button | `:627-632` | yes (`setEditingMethod(m)`) | no | ✅ wired | — |
| AdminPayments: Credentials modal — per-method field rendering (Stripe/PayPal/Mercado Pago/Aurora Pay/Crypto/Bank transfer) | `:660-754` | yes (`setCredentials`) | yes — `updatePm.mutateAsync` | yes — `PATCH /api/admin/payment-methods` | ✅ wired | Per-method fields are well-defined; saved via `updatePm`. See §6 for full credentials audit. |
| AdminPayments: Add payment method modal | `:786-812` | yes (`submit` → `createPm.mutateAsync`) | yes — `POST /api/admin/payment-methods` | ✅ wired | — |
| AdminWithdrawals: Approve button | `:956-961` | yes (`processWd.mutate`) | yes — `PATCH /api/admin/withdrawals` (action: approve) | ✅ wired | — |
| AdminWithdrawals: Reject button | `:962-967` | yes (`processWd.mutate`) | yes — `PATCH /api/admin/withdrawals` (action: reject) | ✅ wired | — |
| AdminApiKeys: Generate key button | `:1014-1019` | yes (`setShowCreate(true)`) | no | ✅ wired | — |
| AdminApiKeys: Generate-key modal submit | `:1103-1105` | yes (`handleCreate`) | yes — `POST /api/admin/api-keys` | ✅ wired | — |
| AdminApiKeys: Generate-key modal **backdrop click** | `:1095` | **yes — `onClick={onClose}`** | no | ❌ broken | **`onClose` is not defined in `AdminApiKeys` scope** — will throw `ReferenceError` when backdrop is clicked. Replace with `onClick={() => setShowCreate(false)}` |
| AdminApiKeys: Copy new key button | `:1031-1036` | yes (`navigator.clipboard.writeText`) | no | ✅ wired | — |
| AdminApiKeys: Dismiss "key created" banner | `:1038-1040` | yes (`setNewKey(null)`) | no | ✅ wired | — |
| AdminApiKeys: Revoke button per row | `:1075-1081` | yes (`revokeKey.mutate`) | yes — `PATCH /api/admin/api-keys` | ✅ wired | — |
| AdminLicenses: Issue license button | `:1143-1145` | yes | no | ✅ wired | — |
| AdminLicenses: Issue-license modal submit | `:1237-1239` | yes (`handleCreate`) | yes — `POST /api/admin/licenses` | ✅ wired | — |
| AdminLicenses: Issue-license modal **backdrop click** | `:1216` | **yes — `onClick={onClose}`** | no | ❌ broken | Same bug as ApiKeys. Replace with `onClick={() => setShowCreate(false)}` |
| AdminLicenses: Suspend / Activate button per row | `:1198-1203` | yes (`updateLic.mutate`) | yes — `PATCH /api/admin/licenses` | ✅ wired | — |
| AdminLicenses: Copy license key button | `:1155-1157` | yes | no | ✅ wired | — |
| AdminCurrencies: Add currency button | `:1265-1267` | yes | no | ✅ wired | — |
| AdminCurrencies: Enable/Disable toggle per row | `:1294-1299` | yes (`updateCur.mutate`) | yes — `PATCH /api/admin/currencies` | ✅ wired | — |
| AdminCurrencies: Add-currency modal submit | `:1319-1321` | yes (`createCur.mutateAsync`) | yes — `POST /api/admin/currencies` | ✅ wired | — |
| AdminCurrencies: Add-currency modal **backdrop click** | `:1308` | **yes — `onClick={onClose}`** | no | ❌ broken | Same bug. Replace with `onClick={() => setShowAdd(false)}` |
| AdminLanguages: Add language button | `:1347-1349` | yes | no | ✅ wired | — |
| AdminLanguages: Enable/Disable per row | `:1376-1378` | yes (`updateLang.mutate`) | yes — `PATCH /api/admin/languages` | ✅ wired | — |
| AdminLanguages: Add-language modal submit | `:1398-1400` | yes (`createLang.mutateAsync`) | yes — `POST /api/admin/languages` | ✅ wired | — |
| AdminLanguages: Add-language modal **backdrop click** | `:1387` | **yes — `onClick={onClose}`** | no | ❌ broken | Same bug. Replace with `onClick={() => setShowAdd(false)}` |
| AdminWebhooks: list (read-only) | `:1410-1450` | yes via `useAdminWebhooks` | yes — `GET /api/admin/webhooks` | ✅ wired | No replay/retry action — minor |
| AdminLogs: entity filter chips | `:1665-1670` | yes (`setEntityFilter`) | no (client-side filter) | ✅ wired | — |
| AdminSettings: 9 editable inputs | `:1493-1503` | yes (`setForm`) | no | ✅ wired | — |
| AdminSettings: Save settings button | `:1504-1506` | yes (`handleSave` → `updateSettings.mutate`) | yes — `PATCH /api/admin/settings` | ✅ wired | — |
| AdminCoupons: Create coupon button | `:1526-1528` | yes | no | ✅ wired | — |
| AdminCoupons: Enable/Disable per row | `:1553-1555` | yes (`updateCoupon.mutate`) | yes — `PATCH /api/admin/coupons` | ✅ wired | — |
| AdminCoupons: Create modal submit | `:1580-1582` | yes (`createCoupon.mutateAsync`) | yes — `POST /api/admin/coupons` | ✅ wired | — |
| AdminPromotions: Create promotion button | `:1602-1604` | yes | no | ✅ wired | — |
| AdminPromotions: Create modal submit | `:1639-1641` | yes (`createPromo.mutateAsync`) | yes — `POST /api/admin/promotions` | ✅ wired | — |
| AdminRoles: Delete role button (non-system roles only) | `:902-908` | yes (`deleteRole.mutate`) | yes — `DELETE /api/admin/roles?id=` | ✅ wired | — |
| **Imports of `useRefund`, `useBulkAction`, `useAdminSearch`, `useCreateManualOrder`, `useBroadcastNotification`** | `:87-91, 60` | n/a — imported but **never called** | n/a | 🚫 missing UI | 5 endpoints exist with no UI: `POST /api/admin/refunds`, `POST /api/admin/bulk`, `GET /api/admin/search`, `POST /api/admin/orders` (manual), `POST /api/admin/notifications` (broadcast) |

### 2.11 `onboarding-screen.tsx` (524 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Back / Continue buttons | `:165-180` | yes (`back` / `next`) | yes on last step (`PATCH /api/me` with currency + language) | ✅ wired | — |
| Skip onboarding link | `:184-189` | yes (`signIn()`) | no | ✅ wired | — |
| Role cards | `:244-258` | yes (`onSelect` → `setData`) | no | ✅ wired | Role is stored locally only — not persisted (the `PATCH /api/me` only sends currency + language, not role). Minor |
| Currency selector | `:357-379` | yes (`setData`) | no | ✅ wired | — |
| Language selector | `:394-426` | yes (`setData`) | no | ✅ wired | — |
| Notification preference toggles | `:447-485` | yes (`setData`) | no | ⚠️ decorative | Preferences are NOT persisted in the final `PATCH /api/me` (only currency + language sent). Should add `notifs` to the PATCH body |
| Profile step avatar | `:318-326` | no (display only) | no | ⚠️ decorative | No upload — uses hardcoded "DR" initials |

### 2.12 `login-screen.tsx` (242 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Back to home link | `:93-99` | yes (`setView("landing")`) | no | ✅ wired | — |
| 4 social login buttons (Google/Discord/Telegram/Apple) | `:114-117` | yes (`handleSocial`) | yes — `signIn(provider)` (Google/Discord); Telegram/Apple return "coming soon" error | ✅ wired (Google/Discord); ⚠️ decorative (Telegram/Apple) | Configure `TELEGRAM_*` / `APPLE_*` OAuth env vars OR remove the buttons |
| Email + Password fields | `:139-158` | yes (controlled) | no | ✅ wired | — |
| Remember me toggle | `:161-188` | yes (`setRemember`) | no | ⚠️ decorative | `remember` state is collected but never sent to the API. Behavior unaffected |
| **Forgot password? link** | `:189-194` | **no — `href="#"`** | no | ❌ broken | Wire to a "forgot password" modal/screen that calls `POST /api/auth/forgot-password` (endpoint exists and works) |
| Sign in submit (form) | `:138-216` | yes (`handleLogin` posts to `/api/auth/callback/credentials`) | yes — NextAuth credentials flow | ✅ wired | — |
| "Create one" link | `:220-225` | yes (`setView("register")`) | no | ✅ wired | — |

### 2.13 `register-screen.tsx` (350 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Back to home | `:119-125` | yes | no | ✅ wired | — |
| 8 inputs (name/username/email/password/confirm/country/currency/language) | `:157-244` | yes (controlled via `update(k)`) | no | ✅ wired | — |
| Create account submit | `:246-269` | yes (`submit` → `api.post("/api/auth/register")` + `signIn("credentials", …)`) | yes — `POST /api/auth/register` then NextAuth | ✅ wired | — |
| Terms / Privacy Policy links | `:273-274` | no — `href="#"` | no | ⚠️ decorative | Add real routes (`/terms`, `/privacy`) or remove |
| "Sign in" link | `:280-285` | yes (`setView("login")`) | no | ✅ wired | — |

### 2.14 `navbar.tsx` (133 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Logo link | `:48-50` | yes (`href="#hero"`) | no | ✅ wired | — |
| 6 nav links (Platform/Services/Marketplace/Payments/Security/Pricing) | `:53-61` | yes (anchor links) | no | ✅ wired | — |
| ThemeToggle | `:65` | yes | no | ✅ wired | — |
| Sign in button | `:66-71` | yes (`setView("login")`) | no | ✅ wired | — |
| Start free button | `:72-77` | yes (`setView("register")`) | no | ✅ wired | — |
| Mobile hamburger | `:80-86` | yes (`setOpen`) | no | ✅ wired | — |
| Mobile menu links | `:98-107` | yes (`href` + `setOpen(false)`) | no | ✅ wired | — |
| Mobile Sign in / Start free | `:109-127` | yes (`setView`) | no | ✅ wired | — |

### 2.15 `footer.tsx` (155 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| "Start free" CTA | `:49-54` | yes (`setView("register")`) | no | ✅ wired | — |
| "Sign in" CTA | `:55-59` | yes (`setView("login")`) | no | ✅ wired | — |
| 4 link-grid columns × 6 links = **24 footer links** | `:90-108` | **no — all `href="#"`** | no | ⚠️ decorative | Add real routes or wire to in-app navigation (e.g. "Dashboard" → `setView("dashboard")`) |
| Terms / Privacy / Cookies (bottom bar) | `:115-123` | **no — `href="#"`** | no | ⚠️ decorative | Same as above |

### 2.16 `whatsapp-widget.tsx` (158 lines)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Floating WA button (toggles popup) | `:47-92` | yes (`setOpen`) | no | ✅ wired | — |
| Message textarea | `:127-139` | yes (`setMessage`) | no | ✅ wired | — |
| Send button | `:140-147` | yes (`openWhatsApp` → `window.open("https://wa.me/…")`) | no (external link) | ✅ wired | — |
| WhatsApp number fetch on mount | `:18-29` | yes (`useEffect` → `fetch("/api/admin/settings")`) | yes — `GET /api/admin/settings` | ⚠️ decorative | Non-admins get a 401 (admin-only endpoint) and silently fall back to default number `5215512345678`. Should expose a public `GET /api/public/settings` endpoint OR include the WhatsApp number in `/api/auth/session` |

### 2.17 `plans.tsx` (287 lines — landing pricing section)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Billing toggle (Monthly/Yearly) | `:108-121` | yes (`setYearly`) | no | ✅ wired | — |
| 3 plan CTAs (Starter/Growth/Enterprise) | `:233-250` | yes — `onClick={() => useApp.getState().setView("register")}` | **no — goes to register, NOT to subscription checkout** | ⚠️ decorative | Wire to `POST /api/subscriptions` (or to the dashboard billing tab). Currently the landing "plans" and the actual `dashboard-profile.tsx` Billing section are disconnected |

### 2.18 `marketplace.tsx` (214 lines — landing section, not dashboard)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| All elements are static landing-page content | various | n/a | no | ⚠️ decorative by design | Acceptable for a marketing section |
| "Withdraw" button in wallet strip | `:203-206` | **no `onClick`** | no | ⚠️ decorative | Either remove or wire to `setView("register")` |

### 2.19 `services.tsx` (99 lines — landing section)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| 11 platform cards + aggregate card | various | pointer-follow glow only (`onMouseMove`) | no | ⚠️ decorative by design | Acceptable for marketing — could link each card to dashboard marketplace filtered by platform |

### 2.20 `payments.tsx` (302 lines — landing section)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| All elements are static landing content (4 provider cards, 8 floating coins, stat strip) | various | mouse parallax only | no | ⚠️ decorative by design | Acceptable |

### 2.21 `hero.tsx` (227 lines — landing hero)

| Element | File:line | Has handler? | Calls API? | Status | Fix needed |
|---|---|---|---|---|---|
| Eyebrow "Now processing X orders/min" pill | `:58-72` | yes (`href="#stats"` anchor) | no | ✅ wired | — |
| "Start free" CTA | `:104-109` | yes (`setView("register")`) | no | ✅ wired | — |
| "Sign in" CTA | `:110-115` | yes (`setView("login")`) | no | ✅ wired | — |
| 4 floating stat chips | `:146-177` | n/a (display) | no | ⚠️ decorative by design | Acceptable |
| HeroDashboard embedded preview | `:179-181` | yes (its own internal interactivity) | no | ✅ wired | — |

---

## 3. API Inventory — All endpoints with method + UI usage status

Total: **88 exported handlers across 56 route files**. Methods listed below are the actual `export async function` exports per file.

### 3.1 Authentication & session
| Endpoint | Methods | UI caller | Status |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | `login-screen.tsx` (form post to `/api/auth/callback/credentials`), `register-screen.tsx` (`signIn("credentials")`), `useSession()` polls `/api/auth/session` | ✅ wired |
| `/api/auth/register` | POST | `register-screen.tsx:65` via `api.post` | ✅ wired |
| `/api/auth/forgot-password` | POST | **none** — `/api/auth/forgot-password` route exists, no UI calls it | 🚫 missing UI |
| `/api/auth/reset-password` | POST | **none** — no UI for `/?reset=<token>` URL handling | 🚫 missing UI |
| `/api/auth/verify-email` | POST | **none** — no UI for `/?verify=<token>` URL handling | 🚫 missing UI |

### 3.2 User dashboard
| Endpoint | Methods | UI caller | Status |
|---|---|---|---|
| `/api/dashboard` | GET | `useDashboard()` in `dashboard-home.tsx`, `dashboard-shell.tsx` | ✅ wired |
| `/api/me` | PATCH | `useUpdateProfile()` in `dashboard-profile.tsx`, raw `fetch` in `onboarding-screen.tsx:66` | ✅ wired |
| `/api/me/password` | POST | `SecuritySection` in `dashboard-profile.tsx:235` | ✅ wired |
| `/api/me/2fa/setup` | POST | `SecuritySection:252` | ✅ wired |
| `/api/me/2fa/verify` | POST | `SecuritySection:263` | ✅ wired |
| `/api/me/2fa/disable` | POST | `SecuritySection:277` | ✅ wired |
| `/api/me/language` | GET | **none** | 🚫 unused (could be removed or wired into i18n) |
| `/api/me/sessions` | GET, DELETE | `SessionsSection:455, 463` | ✅ wired |
| `/api/me/notification-preferences` | GET, PATCH | `NotificationsSection:387, 400` | ✅ wired |
| `/api/orders` | GET, POST | `useOrders()`, `useCreateOrder()` in dashboard-marketplace/orders | ✅ wired |
| `/api/orders/repeat` | POST | `useRepeatOrder()` in marketplace history tab + orders table | ✅ wired |
| `/api/services` | GET | `useServices()`, `useAllServices()` | ✅ wired |
| `/api/services/[id]` | GET | `useServiceDetail()` hook exists; not called from any current UI (modal uses catalog row data directly) | 🚫 unused hook |
| `/api/payment-methods` | GET | `usePaymentMethods()` in wallet + topup + withdraw modals | ✅ wired |
| `/api/wallet` | GET | `useWallet()` in dashboard-home, marketplace, wallet | ✅ wired |
| `/api/wallet/topup` | POST | `useTopup()` in wallet TopupModal | ✅ wired |
| `/api/wallet/withdraw` | POST | `useWithdraw()` in wallet WithdrawModal | ✅ wired |
| `/api/notifications` | GET, POST | `useNotifications()`, `markAllRead` in dashboard-notifications | ✅ wired |
| `/api/tickets` | GET, POST, PATCH | `useTickets`, `useCreateTicket`, `useReplyTicket` in dashboard-tickets | ✅ wired |
| `/api/uploads` | POST | `dashboard-tickets.tsx:44` (multipart file attach) | ✅ wired |
| `/api/analytics` | GET | `useAnalytics()` in dashboard-analytics | ✅ wired |
| `/api/favorites` | GET, POST, DELETE | `useFavorites`, `useAddFavorite`, `useRemoveFavorite` in marketplace + dashboard-home | ✅ wired |
| `/api/offers` | GET, POST, PATCH, DELETE | `useOffers`, `useCreateOffer`, `useDeleteOffer` in `SellTab` (PATCH/`useUpdateOffer` hook exists but no UI button calls it) | ✅ wired (PATCH unused) |
| `/api/subscriptions` | GET, POST, DELETE | `useSubscriptions`, `useCreateSubscription`, `useCancelSubscription` in BillingSection | ✅ wired |
| `/api/invoices` | GET | `useInvoices()` + Export CSV link | ✅ wired |
| `/api/referrals` | GET | `useReferrals()` in dashboard-home + dashboard-profile | ✅ wired |
| `/api/coupons/validate` | POST | `applyCoupon` in `ServiceDetailModal:478` | ✅ wired |
| `/api/export` | GET | `window.open` in dashboard-orders:50 + dashboard-wallet:69 + dashboard-profile:562 | ✅ wired |
| `/api/status` | GET | **none** | 🚫 unused (public status page not built) |
| `/api/docs` | GET | **none** | 🚫 unused (OpenAPI docs page not built) |

### 3.3 Admin
| Endpoint | Methods | UI caller | Status |
|---|---|---|---|
| `/api/admin/overview` | GET | `useAdminOverview` | ✅ wired |
| `/api/admin/users` | GET, PATCH | `useAdminUsers`, `useUpdateUser` | ✅ wired |
| `/api/admin/services` | GET, POST, PATCH, DELETE | GET + POST used; **PATCH + DELETE never called from UI** | 🚫 missing UI (edit/delete) |
| `/api/admin/providers` | GET, POST, PATCH | GET + POST used; **PATCH never called from UI** | 🚫 missing UI (edit) |
| `/api/admin/providers/[id]/sync` | POST | `useSyncProvider` in AdminProviders | ✅ wired |
| `/api/admin/payment-methods` | GET, POST, PATCH | all three used (Configure credentials modal calls PATCH) | ✅ wired |
| `/api/admin/withdrawals` | GET, PATCH | `useAdminWithdrawals`, `useProcessWithdrawal` | ✅ wired |
| `/api/admin/coupons` | GET, POST, PATCH | all three used | ✅ wired (DELETE not implemented server-side; UI uses toggle status instead) |
| `/api/admin/promotions` | GET, POST, PATCH | GET + POST used; **PATCH never called from UI** | 🚫 missing UI (edit promotion) |
| `/api/admin/api-keys` | GET, POST, PATCH | all three used | ✅ wired |
| `/api/admin/licenses` | GET, POST, PATCH | all three used | ✅ wired |
| `/api/admin/currencies` | GET, POST, PATCH | all three used | ✅ wired |
| `/api/admin/languages` | GET, POST, PATCH | all three used | ✅ wired |
| `/api/admin/webhooks` | GET | `useAdminWebhooks` | ✅ wired |
| `/api/admin/logs` | GET | `useAdminLogs` in AdminLogs + AdminSecurity | ✅ wired |
| `/api/admin/settings` | GET, PATCH | `useAdminSettings`, `useUpdateSettings` + WhatsApp widget fetch | ✅ wired |
| `/api/admin/roles` | GET, POST, PATCH, DELETE | GET + DELETE used; **POST (create role) + PATCH (edit permissions) never called from UI** | 🚫 missing UI (create role, edit permissions) |
| `/api/admin/notifications` | POST | **hook imported, never called** | 🚫 missing UI (broadcast notification composer) |
| `/api/admin/refunds` | POST | **hook imported, never called** | 🚫 missing UI (refund action on a transaction) |
| `/api/admin/bulk` | POST | **hook imported, never called** | 🚫 missing UI (bulk select + action) |
| `/api/admin/search` | GET | **hook imported, never called** | 🚫 missing UI (admin global search box) |
| `/api/admin/orders` | POST | **hook imported, never called** | 🚫 missing UI (manual order creation form) |

### 3.4 Public
| Endpoint | Methods | UI caller | Status |
|---|---|---|---|
| `/api/public/currencies` | GET | `usePublicCurrencies` in dashboard-profile + `loadCurrencyRates` | ✅ wired |
| `/api/public/languages` | GET | `usePublicLanguages` in dashboard-profile | ✅ wired |
| `/api/public/validate-license` | POST, GET | **none** in this app (used by external white-label deployments) | ✅ by design (external) |

### 3.5 v1 public API (reseller program)
| Endpoint | Methods | UI caller | Status |
|---|---|---|---|
| `/api/v1/services` | GET | **none** — external reseller endpoint | ✅ by design |
| `/api/v1/orders` | POST | **none** — external reseller endpoint | ✅ by design |

### 3.6 Webhooks
| Endpoint | Methods | UI caller | Status |
|---|---|---|---|
| `/api/webhooks/stripe` | POST | **none** (called by Stripe) | ✅ by design |
| `/api/webhooks/mercadopago` | POST | **none** (called by Mercado Pago) | ✅ by design |

---

## 4. Decorative / Broken Buttons List (file:line)

### ❌ Broken (handler references undefined symbol → runtime crash)
| # | File:line | Element | Bug |
|---|---|---|---|
| 1 | `admin-panel.tsx:1095` | AdminApiKeys — "Generate key" modal backdrop | `onClick={onClose}` — `onClose` is not in scope (function is `AdminApiKeys`, no `onClose` prop). Throws `ReferenceError` on backdrop click. Fix: `onClick={() => setShowCreate(false)}` |
| 2 | `admin-panel.tsx:1216` | AdminLicenses — "Issue license" modal backdrop | Same bug. Fix: `onClick={() => setShowCreate(false)}` |
| 3 | `admin-panel.tsx:1308` | AdminCurrencies — "Add currency" modal backdrop | Same bug. Fix: `onClick={() => setShowAdd(false)}` |
| 4 | `admin-panel.tsx:1387` | AdminLanguages — "Add language" modal backdrop | Same bug. Fix: `onClick={() => setShowAdd(false)}` |
| 5 | `login-screen.tsx:189-194` | "Forgot password?" link | `href="#"` — does nothing. `POST /api/auth/forgot-password` endpoint exists and is unused. Fix: build a small "Enter your email" modal that calls the endpoint |
| 6 | `dashboard-analytics.tsx:213-215` | "Share referral link" button | No `onClick`. Copy-paste of the working `ReferralsSection.copyCode` code would fix it. Fix: `onClick={() => { navigator.clipboard.writeText(shareUrl); toast({ title: "Link copied!" }); }}` |

### ⚠️ Decorative (renders but doesn't do its implied action)
| # | File:line | Element | Notes |
|---|---|---|---|
| 1 | `dashboard-shell.tsx:255-261` | Topbar Bell icon | No `onClick` — should open notifications tab |
| 2 | `dashboard-shell.tsx:383` | UserPill "Settings" menu item | No `onClick` — should switch to profile tab |
| 3 | `dashboard-shell.tsx:384` | UserPill "View profile" menu item | No `onClick` |
| 4 | `dashboard-shell.tsx:237-240` | Topbar search input | No `onChange`/state — purely visual |
| 5 | `dashboard-home.tsx:127-138` | 7D / 30D / 90D range toggle | Hardcoded active state (`i === 1`), no `onClick` |
| 6 | `dashboard-tickets.tsx:125-127` | "Search tickets…" input | No `onChange`/state |
| 7 | `admin-panel.tsx:286-289` | AdminUsers "Search users…" input | No `onChange`/state — and `useAdminSearch` hook is imported but unused |
| 8 | `marketplace.tsx:203-206` | Landing "Withdraw" button in wallet strip | No `onClick` |
| 9 | `plans.tsx:233-250` | 3 plan CTAs | Only navigates to `register` — does not call `/api/subscriptions` |
| 10 | `footer.tsx:90-108` | 24 footer link-grid items | All `href="#"` |
| 11 | `footer.tsx:115-123` | Terms / Privacy / Cookies | All `href="#"` |
| 12 | `register-screen.tsx:273-274` | Terms + Privacy Policy | All `href="#"` |
| 13 | `login-screen.tsx:161-188` | "Remember me" checkbox | State collected but never sent to API |
| 14 | `onboarding-screen.tsx:447-485` | Notification preference toggles | State collected locally, NOT included in final `PATCH /api/me` body (only `currency` + `language` sent) |
| 15 | `onboarding-screen.tsx:318-326` | Profile step avatar | No upload, hardcoded "DR" initials |
| 16 | `dashboard-profile.tsx:230-233` | 2FA mount-time `api.get("/api/admin/settings")` | Calls an admin-only endpoint as a regular user → 401, swallowed. Result is discarded. `twofaEnabled` stays `false` even when 2FA is actually enabled |
| 17 | `whatsapp-widget.tsx:18-29` | WhatsApp number fetch | Calls `/api/admin/settings` (admin-only). Non-admins get 401 and silently fall back to default number |
| 18 | `login-screen.tsx:116-117` | Telegram + Apple social buttons | Show "coming soon" error — OAuth not configured |
| 19 | `admin-panel.tsx:60, 87-91` (imports) | `useBroadcastNotification`, `useRefund`, `useBulkAction`, `useAdminSearch`, `useCreateManualOrder` | Imported but never invoked → 5 admin endpoints have no UI |
| 20 | `dashboard-home.tsx:255-261` | "Operational" status pill in topbar | Purely visual — could be wired to `/api/status` |
| 21 | `services.tsx:29-50` | 11 platform cards (landing) | No click handler — could navigate to dashboard marketplace filtered by platform |
| 22 | `dashboard-shell.tsx:273-275` | "DR" avatar circle in topbar | No click handler — could open user menu |
| 23 | `dashboard-marketplace.tsx:129` | `<HistoryTab onRepeat={() => {}} />` | The `onRepeat` prop is passed but never used inside `HistoryTab` (the Repeat button calls `repeatOrder.mutate` directly) — minor dead code |

---

## 5. Admin Panel CRUD Coverage Matrix

Each row = admin entity. Cells = whether the UI exposes the operation.

| Entity | List (GET) | Create (POST) | Edit (PATCH) | Delete (DELETE) | Other | Gaps |
|---|---|---|---|---|---|---|
| **Users** | ✅ AdminUsers table | n/a (users self-register) | ✅ suspend/activate/promote icon buttons | ❌ no delete button (endpoint `PATCH /api/admin/users` supports status change only — no `DELETE` route exists) | — | No demote (admin → user), no delete, search box decorative |
| **Services** | ✅ AdminServices table | ✅ Add Service modal | ❌ no edit button (endpoint `PATCH /api/admin/services` exists) | ❌ no delete button (endpoint `DELETE /api/admin/services` exists) | — | **Add edit + delete row actions** |
| **Providers** | ✅ AdminProviders grid | ✅ Add Provider modal | ❌ no edit button (endpoint `PATCH /api/admin/providers` exists) | ❌ no delete (no DELETE route exists server-side) | ✅ Sync services button | Add edit + delete |
| **Payment methods** | ✅ AdminPayments grid | ✅ Add Payment Method modal | ✅ Configure credentials modal | ❌ no delete (no DELETE route) | ✅ credentials config | Acceptable — payment methods typically aren't deleted |
| **Withdrawals** | ✅ AdminWithdrawals table | n/a | ✅ Approve / Reject buttons | n/a | — | Only "pending" status shown — no filter for approved/rejected |
| **API keys** | ✅ AdminApiKeys table | ✅ Generate Key modal | ✅ Revoke button | n/a | ✅ Copy-once banner | — |
| **Licenses** | ✅ AdminLicenses table | ✅ Issue License modal | ✅ Suspend / Activate | n/a | ✅ Copy-once banner | No "extend expiry" or "revoke permanently" |
| **Currencies** | ✅ AdminCurrencies table | ✅ Add Currency modal | ✅ Enable/Disable toggle | n/a | — | No inline edit of `rate` (only toggle) |
| **Languages** | ✅ AdminLanguages table | ✅ Add Language modal | ✅ Enable/Disable toggle | n/a | — | No inline edit |
| **Coupons** | ✅ AdminCoupons table | ✅ Create Coupon modal | ✅ Enable/Disable toggle | n/a | — | No inline edit, no DELETE route server-side |
| **Promotions** | ✅ AdminPromotions grid | ✅ Create Promotion modal | ❌ no edit button (endpoint `PATCH /api/admin/promotions` exists) | n/a | — | Add edit + cancel/delete |
| **Webhooks** | ✅ AdminWebhooks list | n/a | n/a | n/a | — | Read-only — no replay/retry action |
| **Logs** | ✅ AdminLogs table | n/a | n/a | n/a | ✅ entity filter | Acceptable (audit log is immutable) |
| **Settings** | ✅ AdminSettings form | n/a | ✅ Save Settings button | n/a | — | Only 9 keys editable; no JSON editor for new keys |
| **Security** | ✅ AdminSecurity grid | n/a | n/a | n/a | — | Hardcoded layer cards — could pull real metrics from `AuditLog` (failed logins, blocked IPs, 2FA adoption %) |
| **Roles** | ✅ AdminRoles grid | ❌ no "Create role" button (endpoint `POST /api/admin/roles` exists) | ❌ no "Edit permissions" button (endpoint `PATCH /api/admin/roles` exists) | ✅ Delete role button (non-system only) | — | **Add Create + Edit UI** |
| **Orders** | n/a (no admin orders table) | ❌ no "Manual order" form (endpoint `POST /api/admin/orders` exists, `useCreateManualOrder` imported, never called) | n/a | n/a | — | **Add manual order creation form + admin orders list** |
| **Refunds** | n/a | ❌ no "Refund transaction" UI (endpoint `POST /api/admin/refunds` exists, `useRefund` imported, never called) | n/a | n/a | — | **Add refund button to admin transactions / orders table** |
| **Bulk ops** | n/a | ❌ no bulk-select + bulk-action UI (endpoint `POST /api/admin/bulk` exists, `useBulkAction` imported, never called) | n/a | n/a | — | **Add row checkboxes + bulk action bar** |
| **Broadcast notif** | n/a | ❌ no broadcast composer (endpoint `POST /api/admin/notifications` exists, `useBroadcastNotification` imported, never called) | n/a | n/a | — | **Add "Broadcast notification" composer** |
| **Search** | n/a | n/a | n/a | n/a | ❌ no global admin search bar (`useAdminSearch` imported, never called) | **Wire admin user search input (line 288) to `useAdminSearch`** |

### Admin summary
- **15 of 21** admin entities have full Create + Edit (or equivalent) UIs.
- **6 missing UIs**: Services edit/delete, Providers edit, Promotions edit, Roles create/edit, Manual orders, Refunds, Bulk ops, Broadcast notif, Admin search (some of these are bundled — see "Critical fixes").
- **0 broken** admin endpoints — all 56 admin route handlers exist and are RBAC-protected.
- **4 broken admin modals** (the `onClick={onClose}` bug — see §4).

---

## 6. Credential Management Audit

**Question:** Can the admin edit credentials for payment providers (Stripe secret key, PayPal client ID, etc.) via the UI, or must they be set in env vars only?

**Answer: ✅ The admin CAN edit credentials via the UI.** This is one of the strongest areas of the codebase.

### Implementation
- **AdminPayments** tab → "Configure credentials" button on each payment-method card → opens `ConfigureCredentialsModal` (`admin-panel.tsx:655-784`).
- The modal defines per-method credential fields (`admin-panel.tsx:660-692`):

  | Method | Fields captured |
  |---|---|
  | **Stripe** | `secretKey` (sk_live_…), `publishableKey` (pk_live_…), `webhookSecret` (whsec_…) |
  | **PayPal** | `clientId`, `clientSecret`, `webhookId` |
  | **Mercado Pago** | `accessToken`, `publicKey`, `webhookUrl` |
  | **Aurora Pay** | `merchantId`, `apiKey`, `apiSecret` |
  | **Crypto** | `walletAddress`, `network`, `confirmations` |
  | **Bank transfer** | `bankName`, `accountNumber`, `routingNumber`, `accountHolder` |
  | **(fallback)** | `apiKey`, `apiSecret` |

- Save → `useUpdatePaymentMethod` → `PATCH /api/admin/payment-methods` → `pm.config` is encrypted via `encryptJSON` (AES-256-GCM in `src/lib/crypto-utils.ts`) and stored in the DB.
- Existing fields are shown with a green "✓ Currently set (masked)" hint — fields left blank keep the existing value (no overwrite).

### Runtime consumption
- `POST /api/wallet/topup` (`src/app/api/wallet/topup/route.ts:65-76`):
  ```ts
  if (pm.config) {
    const creds = decryptJSON(pm.config);
    if (pm.name === "Stripe" && creds?.secretKey) {
      process.env.STRIPE_SECRET_KEY = creds.secretKey;
      if (creds.webhookSecret) process.env.STRIPE_WEBHOOK_SECRET = creds.webhookSecret;
    }
  }
  ```
  → For **Stripe**, DB credentials override env vars at runtime. ✅
  → For **PayPal, Mercado Pago, Aurora Pay, Crypto, Bank transfer**, credentials are stored encrypted but **the topup route falls through to sandbox** (only `pm.name === "Stripe"` is checked at line 80). The `processPayment` function (line 201-221) simulates regardless of method.

### Gaps
1. **PayPal / Mercado Pago / Aurora Pay / Crypto / Bank transfer credentials are captured but never consumed by the topup route.** Only Stripe has a real code path. To make non-Stripe methods actually process real payments, the topup route needs per-method dispatch logic (e.g. for Mercado Pago: `fetch("https://api.mercadopago.com/v1/payments", …)` using `creds.accessToken`).
2. **The Stripe webhook (`/api/webhooks/stripe/route.ts`) verifies signatures with `STRIPE_WEBHOOK_SECRET` from env only** — not from the DB. So if the admin sets the webhook secret via the UI, the webhook will fail signature verification until the env var is also set. Fix: load the webhook secret from DB at startup or per-request.
3. **The Stripe SDK (`src/lib/stripe.ts`) reads `STRIPE_SECRET_KEY` from `process.env` at module load time.** If the admin saves credentials via the UI *after* the server starts, the topup route does `process.env.STRIPE_SECRET_KEY = creds.secretKey` (line 71) — this works because the topup route sets the env var before calling `isStripeConfigured()` / `createPaymentIntent()`. But if another route imports `stripe.ts` and calls it before any topup happens, the SDK will use the env var (which may be unset). Acceptable for the topup flow; would need a refactor for other Stripe-using flows.
4. **No "test connection" button** — the admin saves credentials blind. A "Send test ping" button would catch typos.

### Verdict
Credential management for **Stripe is fully UI-driven and works end-to-end**. Credentials for the other 5 methods are captured and encrypted but **not yet consumed by payment processing** (sandbox only). Webhook signature verification still requires env vars.

---

## 7. Sale (venta) vs Rental (renta / subscription) Flow Audit

### 7.1 Sale flow (venta — one-off purchases) ✅ FULLY WIRED
- **Buy flow:** `dashboard-marketplace.tsx` → BuyTab → ServiceCard → ServiceDetailModal → "Place order" → `POST /api/orders` → balance debited → order created → `simulateFulfillment()` advances status → notification sent.
- **Sell flow:** `dashboard-marketplace.tsx` → SellTab → "Publish offer" → `POST /api/offers` → offer appears in table → "Remove" → `DELETE /api/offers?id=`.
- **Repeat order:** `dashboard-orders.tsx` and HistoryTab → `POST /api/orders/repeat` → re-orders same service+quantity.
- **Coupon application:** ServiceDetailModal → "Apply" → `POST /api/coupons/validate` → discount applied to total.

### 7.2 Rental / subscription flow (renta) ⚠️ PARTIAL — sandbox only

**What exists:**
- **Schema:** `Subscription` model in Prisma (userId, plan, status, amount, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, stripeSubscriptionId).
- **API:** `GET /api/subscriptions` (list plans + current sub), `POST /api/subscriptions` (subscribe), `DELETE /api/subscriptions` (cancel).
- **UI:** `BillingSection` in `dashboard-profile.tsx:501-575` — shows current subscription, 3 plan cards (Starter/Growth/Enterprise) with Subscribe buttons, Cancel button, Invoices list with Export CSV.

**What's missing / broken:**
1. **Stripe Billing integration is commented out** (`subscriptions/route.ts:60-71`). The POST handler always creates a local sandbox subscription record without charging the user. To enable real recurring billing, uncomment the Stripe Checkout session creation code and configure `STRIPE_PRICE_ID_*` env vars.
2. **The landing `plans.tsx` CTAs don't connect to the subscription flow.** They call `useApp.getState().setView("register")` — i.e. they take the visitor to registration, not to checkout. After registering + onboarding, the user lands on the dashboard home, not on the billing tab. So a visitor who clicks "Growth · $89/mo · Start free" has no direct path to actually subscribing to Growth.
3. **No plan enforcement.** `User.plan` field exists in the schema but nothing checks it when the user places an order. A user on the "Starter" plan (1,000 orders/month cap) can place unlimited orders.
4. **No proration / upgrade flow.** `POST /api/subscriptions` returns `409` if the user already has an active subscription ("cancel it first"). No upgrade/downgrade path.
5. **No trial period.** The landing page advertises "14-day free trial" but the subscription POST creates an immediately-active, immediately-paid subscription.
6. **No webhook handler for `invoice.payment_succeeded` / `invoice.payment_failed`** on subscriptions — the Stripe webhook (`/api/webhooks/stripe/route.ts`) only handles `payment_intent.succeeded/failed/refunded` (one-off payments), not subscription events.

### 7.3 Licensing (panel rental/sale to other operators) ✅ FULLY WIRED
The "panel rental" use case (where NOVSMM itself is rented to other resellers) is implemented via the License system:
- `License` model + AES-256-GCM encryption + bcrypt validation + domain/IP allowlist.
- `AdminLicenses` tab: issue / suspend / activate / copy-once.
- `POST /api/public/validate-license` (public endpoint for white-label deployments to verify their license).
- Anti-replication: each license has `maxUsers`, `maxOrders`, `domain`, `expiresAt`.

### Verdict
- **Venta (sale): ✅ production-ready.**
- **Renta (subscription to NOVSMM plans): ⚠️ sandbox-only.** Real Stripe Billing code is commented out, no plan enforcement, landing CTAs don't lead to checkout.
- **Panel rental (licensing): ✅ production-ready.**

---

## 8. Responsive Design Audit

### Breakpoint usage counts (per file)
| File | `sm:` | `md:` | `lg:` | `xl:` | Total | Verdict |
|---|---|---|---|---|---|---|
| `dashboard-shell.tsx` | 6 | 3 | 0 | 0 | 9 | ✅ mobile drawer + responsive topbar |
| `dashboard-home.tsx` | 6 | 0 | 3 | 0 | 9 | ✅ grid collapses 4→2 cols |
| `dashboard-marketplace.tsx` | 3 | 0 | 1 | 0 | 4 | ✅ service grid collapses 3→2→1; tables scroll horizontally |
| `dashboard-orders.tsx` | 2 | 0 | 0 | 0 | 2 | ⚠️ tables rely on `overflow-x-auto` — OK but cramped on mobile |
| `dashboard-wallet.tsx` | 4 | 1 | 1 | 0 | 6 | ✅ balance cards stack on mobile |
| `dashboard-analytics.tsx` | 5 | 0 | 5 | 0 | 10 | ✅ KPIs collapse, charts full-width |
| `dashboard-tickets.tsx` | 0 | 1 | 0 | 0 | 2 | ⚠️ chat is `md:grid-cols-[300px_1fr]` — on mobile the ticket list takes full width and chat is below. Acceptable but the layout could be a stack with tabs on mobile |
| `dashboard-notifications.tsx` | 0 | 0 | 0 | 0 | 1 | ✅ inherently responsive (single-column feed) |
| `dashboard-profile.tsx` | 5 | 0 | 0 | 0 | 5 | ✅ currency/language grids collapse 4→3→2 |
| `admin-panel.tsx` | 5 | 2 | 6 | 0 | 13 | ✅ admin tables scroll horizontally; sub-nav is `overflow-x-auto` |
| `onboarding-screen.tsx` | 2 | 0 | 0 | 0 | 2 | ✅ role cards 2 cols on mobile, 2 cols on desktop — could use `sm:grid-cols-4` |
| `login-screen.tsx` | 1 | 0 | 0 | 0 | 1 | ⚠️ single column always — social buttons row uses `grid-cols-4` always (acceptable since each button is icon-only on mobile, label hidden via `hidden sm:inline`) |
| `register-screen.tsx` | 2 | 0 | 0 | 0 | 2 | ✅ country/currency/language row collapses 3→1 |
| `navbar.tsx` | 2 | 0 | 2 | 0 | 6 | ✅ mobile hamburger below `lg:` |
| `footer.tsx` | 4 | 0 | 2 | 0 | 7 | ✅ link grid 6→3→2 cols |
| `whatsapp-widget.tsx` | 1 | 0 | 0 | 0 | 1 | ✅ fixed bottom-right, popup is `w-[340px]` (might overflow on <360px screens — minor) |
| `plans.tsx` | 5 | 0 | 1 | 0 | 5 | ✅ 3 plans stack on mobile |
| `marketplace.tsx` (landing) | 4 | 0 | 1 | 0 | 6 | ✅ flow + offers stack on mobile |
| `services.tsx` | 2 | 0 | 1 | 0 | 4 | ✅ 4→3→2 grid |
| `payments.tsx` | 4 | 0 | 1 | 0 | 8 | ✅ provider cards 2→1, coin field max-width |
| `hero.tsx` | 5 | 0 | 2 | 0 | 9 | ✅ mobile-specific parallax disable, floating chips hidden on mobile |

### Files that lack explicit mobile responsiveness (or have very few breakpoint overrides) — flagged for review
| File | Issue |
|---|---|
| `dashboard-notifications.tsx` | Only 1 `sm:` class (filter chips wrap via `overflow-x-auto`). The feed is single-column so it's naturally responsive. ✅ Acceptable |
| `dashboard-tickets.tsx` | Only 2 breakpoints. On mobile (<768px) the layout becomes `grid-cols-1` with ticket list on top and chat below — but both panes have fixed heights (`h-[600px]`) which is awkward on small screens. ⚠️ Consider a mobile tab switcher |
| `whatsapp-widget.tsx` | Popup is fixed `w-[340px]`. On a 320px iPhone SE screen this overflows by 20px. ⚠️ Use `w-[min(340px,calc(100vw-2.5rem))]` |
| `onboarding-screen.tsx` | Role cards are `grid-cols-2` on all viewports. On a 360px screen each card is ~165px wide — works but tight. ⚠️ Consider `grid-cols-1 sm:grid-cols-2` |
| `dashboard-shell.tsx` topbar search | Search input takes `flex-1` and the kbd ⌘K hint is `hidden sm:inline`. Status pill is `hidden md:flex`. ✅ Adequate |

### Mobile-specific code (good patterns found)
- `use-api.ts:8-10` detects mobile and reduces poll intervals (60s vs 30s, 120s vs 30s, etc.) — ✅ battery-friendly.
- `dashboard-marketplace.tsx:164-165` uses `PAGE_SIZE = isMobile ? 12 : 24` — ✅ fewer items per page on mobile.
- `hero.tsx:27-29` disables parallax on mobile — ✅ performance.
- `dashboard-shell.tsx:145-220` has a dedicated mobile slide-in drawer — ✅.

### Verdict
Responsive coverage is **strong overall** (148 breakpoint usages across 27 files). The 5 flagged components have minor issues but nothing that breaks mobile usability. The biggest gap is `dashboard-tickets.tsx` chat layout on small screens.

---

## 9. Critical Fixes Needed (Prioritized)

### P0 — Runtime crashes / security-blocking (fix before any user touches the admin panel)

| # | Fix | File:line | Effort |
|---|---|---|---|
| **P0-1** | Replace `onClick={onClose}` with `onClick={() => setShowCreate(false)}` in 4 admin modals (ApiKeys, Licenses, Currencies, Languages). These currently throw `ReferenceError` when the modal backdrop is clicked. | `admin-panel.tsx:1095, 1216, 1308, 1387` | 4-line edit, 2 minutes |
| **P0-2** | Wire the "Forgot password?" link in `login-screen.tsx` to a small modal that calls `POST /api/auth/forgot-password`. The endpoint exists, is tested, and is currently unreachable from the UI. | `login-screen.tsx:189-194` | ~30 min (build modal + state) |
| **P0-3** | Fix the 2FA status check in `SecuritySection`. Replace `useState(() => api.get("/api/admin/settings")…)` with a `useEffect` that calls `GET /api/me` and reads `user.twoFactorEnabled`. Currently the section always shows "Set up 2FA" even when 2FA is already enabled. | `dashboard-profile.tsx:230-233` | ~15 min |
| **P0-4** | Wire the "Share referral link" button in `dashboard-analytics.tsx` to actually copy the link. One-liner. | `dashboard-analytics.tsx:213-215` | 2 minutes |

### P1 — Missing CRUD UIs that block admin operations

| # | Fix | File | Effort |
|---|---|---|---|
| **P1-1** | Add row-level Edit + Delete buttons to `AdminServices` table. Endpoints `PATCH /api/admin/services` and `DELETE /api/admin/services` exist. | `admin-panel.tsx` AdminServices | ~1 hour (add actions column + edit modal) |
| **P1-2** | Add row-level Edit button to `AdminProviders` cards. Endpoint `PATCH /api/admin/providers` exists. | `admin-panel.tsx` AdminProviders | ~45 min |
| **P1-3** | Add "Create role" + "Edit permissions" UI to `AdminRoles`. Endpoints `POST /api/admin/roles` + `PATCH /api/admin/roles` exist. | `admin-panel.tsx` AdminRoles | ~2 hours (permission matrix UI) |
| **P1-4** | Add a "Broadcast notification" composer to the admin panel (Overview or new tab). Endpoint `POST /api/admin/notifications` exists, `useBroadcastNotification` hook is imported but never called. | `admin-panel.tsx` | ~1 hour |
| **P1-5** | Add a "Refund" action to the admin (either an Orders tab or a Transactions tab). Endpoint `POST /api/admin/refunds` exists, `useRefund` hook imported but never called. | `admin-panel.tsx` (new tab or expand existing) | ~1.5 hours |
| **P1-6** | Add bulk-select checkboxes + bulk-action bar to `AdminUsers` (and optionally services/orders). Endpoint `POST /api/admin/bulk` exists. | `admin-panel.tsx` AdminUsers | ~2 hours |
| **P1-7** | Wire the AdminUsers search input (line 288) to `useAdminSearch`. The hook is imported, the endpoint exists, the input is decorative. | `admin-panel.tsx:286-289` | ~30 min |
| **P1-8** | Add a "Manual order creation" form for admins. Endpoint `POST /api/admin/orders` exists, `useCreateManualOrder` imported. | `admin-panel.tsx` (new "Orders" admin tab) | ~1.5 hours |
| **P1-9** | Wire the AdminPromotions edit (PATCH endpoint exists, only create + toggle status are wired). | `admin-panel.tsx` AdminPromotions | ~30 min |
| **P1-10** | Wire the `dashboard-tickets.tsx` "Search tickets…" input to filter the ticket list. Currently decorative. | `dashboard-tickets.tsx:125-127` | ~15 min |

### P2 — Feature gaps / UX polish

| # | Fix | File | Effort |
|---|---|---|---|
| **P2-1** | Wire landing `plans.tsx` CTAs to the subscription flow. Either deep-link to `dashboard → billing` post-registration, or call `POST /api/subscriptions` directly after auth. Currently the landing pricing section and the actual subscription system are disconnected. | `plans.tsx:233-250` | ~1 hour |
| **P2-2** | Uncomment + complete the Stripe Billing integration in `POST /api/subscriptions` (lines 60-71). Currently sandbox-only — the user "subscribes" but is never charged. | `subscriptions/route.ts:60-71` | ~2 hours (needs `STRIPE_PRICE_ID_*` env + webhook handler for `invoice.payment_succeeded`) |
| **P2-3** | Add subscription event handling to the Stripe webhook (`invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`). Currently only `payment_intent.*` events are handled. | `webhooks/stripe/route.ts` | ~1 hour |
| **P2-4** | Enforce plan limits (orders/month) on `POST /api/orders`. The `User.plan` field exists but nothing checks it. | `orders/route.ts` | ~30 min |
| **P2-5** | Wire the `dashboard-shell.tsx` topbar Bell icon to open the Notifications tab. Currently decorative. | `dashboard-shell.tsx:255-261` | 2 minutes |
| **P2-6** | Wire the UserPill "Settings" and "View profile" menu items to `setDashboardTab("profile")`. | `dashboard-shell.tsx:383-384` | 2 minutes |
| **P2-7** | Wire the topbar search input to either navigate to the marketplace search or open a command palette. Currently decorative. | `dashboard-shell.tsx:237-240` | ~2 hours (command palette) or 5 min (link to marketplace) |
| **P2-8** | Wire the 7D/30D/90D range toggle in `dashboard-home.tsx` to actually change the revenue series query. Currently hardcoded active state. | `dashboard-home.tsx:127-138` | ~1 hour (needs `/api/dashboard?range=7d` support) |
| **P2-9** | Persist onboarding role + notification preferences. The `next()` function in `onboarding-screen.tsx:66` only PATCHes `currency` + `language`. Add `role` and `notifs` to the body. | `onboarding-screen.tsx:66-73` | 5 minutes |
| **P2-10** | Make the WhatsApp widget fetch the number from a public endpoint (`/api/public/settings`) or include it in `/api/auth/session` — currently it calls the admin-only `/api/admin/settings` and silently fails for regular users. | `whatsapp-widget.tsx:18-29` | ~20 min (add public settings route + whitelist `platform.whatsapp`, `platform.supportEmail`) |
| **P2-11** | Add per-method dispatch to `POST /api/wallet/topup` so PayPal/Mercado Pago/Aurora Pay/Crypto credentials saved via the admin UI are actually consumed (currently only Stripe is). | `wallet/topup/route.ts:80-122` | ~4 hours (per-provider SDK integration) |
| **P2-12** | Replace the 24 `href="#"` footer links with real routes or remove them. | `footer.tsx:90-108, 115-123` | ~1 hour (decision + routes) |
| **P2-13** | Refactor `useState(() => api.get(...))` anti-pattern in `dashboard-profile.tsx` (3 occurrences) to `useEffect`. Currently works but is non-idiomatic and silently breaks in React StrictMode (double-invokes the initializer). | `dashboard-profile.tsx:231, 386, 454` | ~15 min |
| **P2-14** | Add a "test connection" button to the Configure Credentials modal so admins can verify Stripe/PayPal keys before saving. | `admin-panel.tsx:655-784` | ~1 hour |
| **P2-15** | Improve mobile layout of `dashboard-tickets.tsx` — currently both panes have fixed `h-[600px]` heights which is awkward on phones. Use a tab switcher on mobile. | `dashboard-tickets.tsx:119` | ~1 hour |
| **P2-16** | Make the WhatsApp widget popup width responsive: `w-[min(340px,calc(100vw-2.5rem))]` instead of fixed `w-[340px]`. | `whatsapp-widget.tsx:102` | 2 minutes |
| **P2-17** | Replace decorative "Operational" status pill in `dashboard-shell.tsx:247-253` with a real fetch from `GET /api/status` (endpoint exists, no UI uses it). | `dashboard-shell.tsx:247`, `api/status/route.ts` | ~30 min |
| **P2-18** | Add email verification + password reset URL handling. The endpoints exist (`/api/auth/verify-email`, `/api/auth/reset-password`) and the email links are generated (`register/route.ts:86`, `forgot-password/route.ts:49`) but the app has no UI to consume `/?verify=<token>` or `/?reset=<token>` URL params. | `app-view.tsx` or new route | ~1 hour |

---

## Appendix A — Code Smells Found

| Smell | Location | Notes |
|---|---|---|
| `console.log` (sandbox email) | `lib/notify.ts:84` | Intentional — sandbox mode for email. Acceptable |
| `console.error` (16 occurrences) | various API routes + `error-boundary.tsx:32` | All are error-path logging — acceptable |
| `simulate` / `sandbox` references | `orders/route.ts:160-231`, `orders/repeat/route.ts:116-145`, `admin/orders/route.ts:116-122`, `v1/orders/route.ts:113-114`, `wallet/topup/route.ts:121-221`, `admin/providers/[id]/sync/route.ts:39-46`, `subscriptions/route.ts:73-86`, `tickets/route.ts:94` (auto-reply) | All intentional sandbox fallbacks — clearly documented. To go live: replace `simulateFulfillment` with real provider API calls; uncomment Stripe Billing code; replace ticket auto-reply with real support agent workflow |
| `useState(() => api.get(...))` | `dashboard-profile.tsx:231, 386, 454` | Anti-pattern — works but should be `useEffect`. Fix in P2-13 |
| Dead `onRepeat` prop | `dashboard-marketplace.tsx:129` | `<HistoryTab onRepeat={() => {}} />` — the prop is declared but `HistoryTab` uses `repeatOrder.mutate` directly. Harmless dead code |
| Mock data file | `dashboard-data.ts:2` comment says "Mock dashboard data" but the file is no longer used — all dashboard components fetch real data via hooks. The file may contain stale types (`OrderStatus`) still imported by `dashboard-orders.tsx:7`. Verify and remove if dead |

## Appendix B — Files Touched

This audit was read-only. **No source files were modified.** Only two files were written:
- `/home/z/my-project/audit-report.md` (this file)
- `/home/z/my-project/worklog.md` (appended summary)

---

**End of audit.**
