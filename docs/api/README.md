# NOVSMM API Reference

## Overview

NOVSMM provides 71 API routes organized into 11 domains. All routes use JSON for request/response bodies and follow RESTful conventions.

## Authentication

### Session-based (Dashboard)
- **Cookie**: `next-auth.session-token` (httpOnly, secure, sameSite=lax)
- **CSRF**: Origin header checked on state-changing requests
- **Rate limit**: 300 req/min per IP (general), 20/15min for auth

### API Key (Reseller API)
- **Header**: `Authorization: Bearer nvsk_live_xxxxx`
- **No CSRF**: Bearer tokens are exempt from Origin check
- **Rate limit**: Same as session-based

## Response Format

### Success (200/201)
```json
{
  "data": "...",
  "message": "Optional success message"
}
```

### Error (4xx/5xx)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "requestId": "uuid"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (Prisma P2002) |
| `VALIDATION_ERROR` | 422 | Zod validation failed |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## API Domains

### Auth (`/api/auth/*`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/session` | GET | None | Get current session |
| `/api/auth/csrf` | GET | None | Get CSRF token |
| `/api/auth/register` | POST | None | Register new user |
| `/api/auth/forgot-password` | POST | None | Request password reset |
| `/api/auth/reset-password` | POST | None | Reset password with token |
| `/api/auth/callback/credentials` | POST | None | Login with email+password |
| `/api/auth/callback/google` | GET | None | Google OAuth callback |

### User Account (`/api/me/*`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/me` | GET | User | Get profile |
| `/api/me` | PATCH | User | Update profile |
| `/api/me/password` | POST | User | Change password |
| `/api/me/sessions` | GET | User | List active sessions |
| `/api/me/sessions` | DELETE | User | Revoke sessions |
| `/api/me/language` | PATCH | User | Change language |
| `/api/me/loyalty` | GET | User | Get loyalty points + achievements |
| `/api/me/2fa/setup` | POST | User | Start 2FA setup |
| `/api/me/2fa/verify` | POST | User | Confirm 2FA setup |
| `/api/me/2fa/disable` | POST | User | Disable 2FA |
| `/api/me/notification-preferences` | PATCH | User | Update notification prefs |

### Orders (`/api/orders/*`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/orders` | GET | User | List orders (with filter/search) |
| `/api/orders` | POST | User | Create order |
| `/api/orders` | PATCH | User | Cancel order (within 60s) |
| `/api/orders/mass` | POST | User | Create multiple orders |
| `/api/orders/repeat` | POST | User | Repeat previous order |

### Wallet (`/api/wallet/*`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/wallet` | GET | User | Get balance + transactions |
| `/api/wallet/topup` | POST | User | Top-up wallet |
| `/api/wallet/withdraw` | POST | User | Request withdrawal |

### Services (`/api/services/*`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/services` | GET | Optional | List services (paginated) |
| `/api/services/[id]` | GET | Optional | Get service details |

### Marketplace (`/api/offers`, `/api/favorites`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/offers` | GET | User | List marketplace offers |
| `/api/offers` | POST | User | Create offer |
| `/api/offers` | PATCH | User | Update offer |
| `/api/offers` | DELETE | User | Delete offer |
| `/api/favorites` | GET | User | List favorites |
| `/api/favorites` | POST | User | Add favorite |
| `/api/favorites` | DELETE | User | Remove favorite |

### Notifications (`/api/notifications`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/notifications` | GET | User | List notifications |
| `/api/notifications` | POST | User | Mark as read |

### Dashboard (`/api/dashboard`, `/api/analytics`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/dashboard` | GET | User | Dashboard data (orders, stats, series) |
| `/api/analytics` | GET | User | Analytics + AI insights |

### Support (`/api/tickets`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/tickets` | GET | User | List tickets |
| `/api/tickets` | POST | User | Create ticket |
| `/api/tickets` | PATCH | User | Update ticket |

### Admin (`/api/admin/*`)
All admin routes require `role === "admin"`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/overview` | GET | Platform stats |
| `/api/admin/users` | GET | List users (paginated) |
| `/api/admin/users` | PATCH | Update user (role, status, balance) |
| `/api/admin/users/adjust-balance` | POST | Manual balance adjustment |
| `/api/admin/orders` | GET | All orders |
| `/api/admin/orders` | POST | Create order (admin) |
| `/api/admin/refunds` | POST | Process refund |
| `/api/admin/services` | GET | All services |
| `/api/admin/services` | PATCH | Update service |
| `/api/admin/providers` | GET | List providers |
| `/api/admin/providers` | PATCH | Update provider |
| `/api/admin/providers/[id]/sync` | POST | Sync provider catalog |
| `/api/admin/payment-methods` | GET | List payment methods |
| `/api/admin/payment-methods` | PATCH | Update payment method |
| `/api/admin/api-keys` | GET | List API keys |
| `/api/admin/api-keys` | POST | Create API key |
| `/api/admin/licenses` | GET | List licenses |
| `/api/admin/licenses` | POST | Create license |
| `/api/admin/coupons` | GET | List coupons |
| `/api/admin/coupons` | POST | Create coupon |
| `/api/admin/promotions` | GET | List promotions |
| `/api/admin/promotions` | POST | Create promotion |
| `/api/admin/notifications` | POST | Broadcast notification |
| `/api/admin/settings` | GET | Platform settings |
| `/api/admin/settings` | PATCH | Update settings |
| `/api/admin/roles` | GET | List roles |
| `/api/admin/roles` | POST | Create role |
| `/api/admin/logs` | GET | Audit logs |
| `/api/admin/search` | GET | Global search |
| `/api/admin/languages` | PATCH | Update language |
| `/api/admin/currencies` | PATCH | Update currency |
| `/api/admin/withdrawals` | GET | List withdrawals |
| `/api/admin/withdrawals` | POST | Approve/reject withdrawal |
| `/api/admin/bulk` | POST | Bulk operations |

### Webhooks (`/api/webhooks/*`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/webhooks/stripe` | POST | HMAC | Stripe webhook |
| `/api/webhooks/mercadopago` | POST | HMAC | Mercado Pago webhook |
| `/api/webhooks/nowpayments` | GET/POST | HMAC | NowPayments webhook |

### Public API v1 (`/api/v1/*`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/services` | GET | API Key | List services |
| `/api/v1/orders` | POST | API Key | Create order |

### Health (`/api/health/*`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health/live` | GET | None | Liveness probe |
| `/api/health/ready` | GET | None | Readiness probe |
| `/api/health/db` | GET | None | Database health |
| `/api/status` | GET | None | Public status page |
| `/api/metrics` | GET | Optional | Prometheus metrics |

### Other
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/public/settings` | GET | None | Public platform settings |
| `/api/payment-methods` | GET | None | Active payment methods |
| `/api/invoices` | GET | User | List invoices |
| `/api/referrals` | GET | User | Referral stats |
| `/api/coupons/validate` | POST | User | Validate coupon |
| `/api/uploads` | POST | User | Upload attachment |
| `/api/export` | GET | User | Export data (CSV) |
| `/api/docs` | GET | None | API documentation |

## Rate Limits

| Route Pattern | Limit | Window |
|---------------|-------|--------|
| `/api/auth/callback/credentials` | 20 | 15 min |
| `/api/auth/register` | 10 | 1 hour |
| `/api/auth/forgot-password` | 5 | 1 hour |
| `/api/wallet/topup` | 10 | 1 min |
| `/api/wallet/withdraw` | 10 | 1 min |
| `/api/orders` | 20 | 1 min |
| `/api/tickets` | 20 | 1 min |
| `/api/admin/*` | 120 | 1 min |
| `/api/*` (general) | 300 | 1 min |

## WebSocket

Connect to the notifications service for real-time push:

```javascript
import { io } from "socket.io-client";

const socket = io("/?XTransformPort=3003", {
  transports: ["websocket", "polling"],
  auth: { token: "<nextauth-jwt>" }  // Required for per-user rooms
});

socket.on("notification", (data) => {
  console.log("New notification:", data);
});
```

**Events:**
- `connected` — connection established
- `notification` — new notification (per-user room)
- `disconnect` — connection lost
