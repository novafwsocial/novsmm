# NOVSMM — Payment Credentials Setup Guide

This guide shows how to configure each payment method in Admin → Payments → Configure credentials.

All credentials are encrypted at rest with AES-256-GCM (`LICENSE_ENCRYPTION_KEY`).

---

## 1. Stripe (Credit Cards)

### Get your credentials:
1. Go to https://dashboard.stripe.com/apikeys
2. Copy the **Secret key** (starts with `sk_live_` or `sk_test_`)
3. Go to https://dashboard.stripe.com/webhooks
4. Click **Add endpoint**
5. URL: `https://novsmm.shop/api/webhooks/stripe`
6. Events to subscribe:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
7. Copy the **Signing secret** (starts with `whsec_`)

### Configure in NOVSMM:
Admin → Payments → Stripe → Configure credentials:
- **Secret Key**: `sk_live_xxx`
- **Webhook Secret**: `whsec_xxx`

---

## 2. PayPal

### Get your credentials:
1. Go to https://developer.paypal.com/dashboard/applications/sandbox (or live)
2. Create a REST API app
3. Copy **Client ID** and **Client Secret**
4. Go to https://developer.paypal.com/dashboard/webhooks
5. Add webhook URL: `https://novsmm.shop/api/webhooks/paypal`
6. Event types:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
7. Copy the **Webhook ID** (starts with `WH-`)

### Configure in NOVSMM:
Admin → Payments → PayPal → Configure credentials:
- **Client ID**: `AeA_xxx`
- **Client Secret**: `EL_xxx`
- **Webhook ID**: `WH-XXX-XXX-XXX`

---

## 3. Mercado Pago (LATAM)

### Get your credentials:
1. Go to https://www.mercadopago.com.mx/developers/panel
2. Copy **Access Token** (starts with `APP_USR-` for production)
3. Go to **Notificaciones / Webhooks**
4. URL: `https://novsmm.shop/api/webhooks/mercadopago`
5. Events: `payment`, `plan`, `subscription_preapproval`

### Configure in NOVSMM:
Admin → Payments → Mercado Pago → Configure credentials:
- **Access Token**: `APP_USR-xxx`

---

## 4. NowPayments (Crypto)

### Get your credentials:
1. Go to https://account.nowpayments.io
2. Profile → API Keys → Create API key
3. Copy the **API Key**
4. Go to Account Settings → IPN (Instant Payment Notification)
5. IPN URL: `https://novsmm.shop/api/webhooks/nowpayments`
6. Copy the **IPN Secret**

### Configure in NOVSMM:
Admin → Payments → NowPayments → Configure credentials:
- **API Key**: `xxx`
- **IPN Secret**: `xxx`

---

## 5. Manual (WhatsApp / Zelle / Wire)

No credentials needed. This method creates a pending transaction and instructs the user to contact support via WhatsApp.

The WhatsApp number is configured in Settings → `support_whatsapp` (format: `521XXXXXXXXXX` for Mexico).

---

## Testing Credentials

### Stripe Test Mode:
- Secret Key: `sk_test_5123...`
- Test card: `4242 4242 4242 4242`
- Any future expiry, any CVC

### PayPal Sandbox:
- Use sandbox credentials from https://developer.paypal.com

### Mercado Pago Test:
- Use test credentials from the developer panel

---

## Verification

After configuring credentials, click **Test Connection** in Admin → Payments to verify each provider is reachable.

For full end-to-end testing:
1. Top up your wallet with $10
2. Complete the payment on the provider's checkout
3. Verify the balance is credited (webhook confirms payment)
4. Check Admin → Payments → logs for webhook delivery
