# PAYMENT-CLEANUP-1 — Work Record

**Agent**: full-stack-developer (Z.ai Code)
**Task**: Clean up payment methods to 5 final methods (Stripe, PayPal, Mercado Pago, NowPayments, Manual). Remove Aurora Pay, Crypto (generic), Bank transfer, AurPay, DePay.

## What was done

### Files modified (5)

1. **`prisma/seed.ts`** — Replaced the 6-entry `paymentMethods` array with the final 5 entries (Stripe/PayPal/Mercado Pago/NowPayments/Manual). Added a post-upsert cleanup loop that `deleteMany`s the 5 obsolete methods (Aurora Pay, Crypto, Bank transfer, AurPay, DePay). Changed `update: {}` to a populated `update` payload (glyph, tone, settleTime, fee, currencies, sortOrder) so re-running the seed converges existing rows to the canonical sort order.

2. **`src/components/novsmm/dashboard-wallet.tsx`** — Withdraw modal `<select>`: removed "Bank transfer (legacy)" option, added "Stripe" and "Manual (WhatsApp / Zelle / Wire)" options, updated the dedup filter to match the new 5-method static list. Removed the dead `result?.provider === "crypto"` branch in `TopupModal.handleSubmit` (NowPayments replaced the generic Crypto path). Kept `useState("PayPal")` defaults per spec.

3. **`src/components/novsmm/payments.tsx`** — Replaced the 4-entry `PROVIDERS` array with the 5-entry version (Stripe added at top with the spec's exact metadata). Updated the footer stat `<Counter to={4}>` → `<Counter to={5}>` for "Payment gateways". Updated the SectionHeading description to mention Stripe explicitly.

4. **`src/components/novsmm/faq-section.tsx`** — Replaced the obsolete "Bank transfers: SEPA, SPEI, PIX, ACH" FAQ answer with a "Manual settlement: WhatsApp, Zelle, or wire transfer" answer reflecting the new Manual method.

5. **`src/app/api/wallet/topup/route.ts`** — Five changes:
   - JSDoc dispatch table updated (removed Bank transfer, added NowPayments + Manual lines).
   - PayPal block: now passes `txn.publicId` as `custom_id` on the order, persists `paypal:<orderId>` in `txn.reference`, returns `orderId` in response. Added comment pointing to `/api/webhooks/paypal`.
   - Manual block (section 5): rewrote with new "Manual payment (WhatsApp / Zelle / Wire)" header, explicitly sets `status: "pending"` + descriptive reference, returns `reference` + `whatsappUrl` + `instructions` (keeps WhatsApp deep link for backward compat with frontend).
   - Removed dead `if (pm.name === "Crypto" && creds?.walletAddress)` block.
   - Renamed legacy fallback comment from "Legacy methods / Bank transfer / Crypto / unconfigured methods" to "Unconfigured methods (sandbox fallback)".

### Files created (1)

6. **`src/app/api/webhooks/paypal/route.ts`** — New PayPal webhook handler. Flow:
   - Reads raw body, parses JSON, looks up PayPal PaymentMethod + decrypts config (clientId, clientSecret, webhookId).
   - Reads PayPal transmission headers (paypal-transmission-id, -time, -sig, -cert-url, -auth-algo).
   - Creates a `webhookLog` row.
   - Fetches PayPal access token via `POST /v1/oauth2/token` (client_credentials grant).
   - Calls `POST /v1/notifications/verify-webhook-signature` with headers + webhook_id + event. Fails closed if `verification_status !== "SUCCESS"`.
   - On `PAYMENT.CAPTURE.COMPLETED`: extracts `resource.custom_id` (= our publicId), finds pending txn by publicId (with `paypal:<orderId>` and `paypal:<captureId>` reference fallbacks), credits wallet atomically via `db.$transaction`, sends success notification, writes audit log.
   - On `PAYMENT.CAPTURE.DENIED`: marks pending txn as failed, sends warning notification.
   - **Always returns 200 OK** to stop PayPal retries.
   - `GET /api/webhooks/paypal` returns the webhook URL + setup note.

### Files deleted (5)

7. **`src/lib/aurpay.ts`** — AURPay gateway client.
8. **`src/lib/depay.ts`** — DePay gateway client.
9. **`src/app/api/webhooks/aurpay/route.ts`** (entire `aurpay/` folder) — AURPay webhook handler.
10. **`src/app/api/webhooks/depay/route.ts`** (entire `depay/` folder) — DePay webhook handler.
11. **`public/aurpay-logo.png`** — AURPay brand logo asset.

## Verification

- **`bun run lint`**: 0 errors. 3 pre-existing warnings unrelated to this task.
- **`bunx tsx prisma/seed.ts`**: ran successfully. Output `✓ 5 payment methods (removed 5 obsolete)`.
- **`GET /api/payment-methods`** (live, post-seed): returns exactly 5 methods in correct order:
  1. Stripe (sortOrder 1)
  2. PayPal (sortOrder 2)
  3. Mercado Pago (sortOrder 3)
  4. NowPayments (sortOrder 4)
  5. Manual (sortOrder 5)
- **`GET /api/webhooks/paypal`** (live): HTTP 200, returns webhook URL + setup note. Compiled cleanly (588ms first request, 18ms cached).
- **`GET /`** (live): HTTP 200 — landing renders without errors.
- **`grep "Aurora Pay|AurPay|DePay|Bank transfer" src/`**: 0 matches.
- **`grep "pm.name === 'Crypto'"`**: 0 matches.
- **dev.log**: no compilation errors after edits.

## Issues encountered

- **Initial seed left sortOrders stale**: with `update: {}`, the upsert was a no-op on existing rows, so PayPal and Stripe both ended up at sortOrder 1 (PayPal kept its pre-existing sortOrder 1, Stripe was newly created with sortOrder 1). Fixed by populating the `update` payload with all canonical fields so the seed is now idempotent and converges to the intended sort order.
- **Manual handler minimal spec vs existing implementation**: the spec's minimal Manual handler didn't include `whatsappUrl`, which would break the frontend's `window.open(result.whatsappUrl, "_blank")` call. Kept the existing richer implementation (WhatsApp deep link + admin notification) but updated the comment header + added `reference` + `instructions` to the response payload to satisfy the spec's contract.

## Key references for next agents

- The PayPal webhook looks up pending transactions by `publicId` (sent as `custom_id` in the PayPal order) with fallbacks to `paypal:<orderId>` and `paypal:<captureId>` references.
- The Manual handler returns `whatsappUrl` (deep link) + `reference` + `instructions` — frontend opens WhatsApp via `result.whatsappUrl`.
- NowPayments webhook is unchanged (`/api/webhooks/nowpayments`). Stripe webhook is unchanged (`/api/webhooks/stripe`). Mercado Pago webhook is unchanged (`/api/webhooks/mercadopago`).
- The 5 final payment methods are seeded with sortOrders 1-5; re-running the seed is safe and idempotent.
