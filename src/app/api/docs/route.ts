import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/docs — API documentation (OpenAPI-style JSON).
 * Documents the public v1 API for reseller integrations.
 *
 * The v1 API follows the PerfectPanel / JAP contract — the de-facto standard
 * for SMM panel reseller APIs. This ensures compatibility with existing
 * bots, panels, and automation tools in the SMM ecosystem.
 */
export async function GET() {
  return apiOk({
    name: "NOVSMM API",
    version: "1.0.0",
    baseUrl: "/api/v1",
    auth: {
      type: "Bearer",
      description: "Use your API key (nvsk_live_xxx) in the Authorization header",
      header: "Authorization: Bearer nvsk_live_xxx",
    },
    permissions: {
      read: "Access catalog, order status, balance, refill status",
      order: "Place orders, cancel orders, request refills",
      wallet: "Access wallet balance (subset of read)",
      marketplace: "Manage marketplace offers (sell tab)",
    },
    endpoints: [
      // ── Catalog ──
      {
        method: "GET",
        path: "/api/v1/services",
        description: "List all active services",
        permission: "read",
        response: {
          status: "success",
          services: [
            {
              service: "service_id",
              name: "Instagram · Followers HQ",
              platform: "Instagram",
              category: "followers",
              quality: "hq",
              delivery_time: "0-2h",
              rate: 2.4,
              min: 50,
              max: 100000,
              speed: "1.2K/d",
            },
          ],
          count: 12,
        },
      },

      // ── Orders ──
      {
        method: "POST",
        path: "/api/v1/orders",
        description: "Place a new order (single or multi, with optional drip-feed)",
        permission: "order",
        body: {
          // Single order
          service: "service_id",
          link: "https://instagram.com/yourpost",
          quantity: 1000,
          // Optional drip-feed
          runs: 5,
          interval: "10m",
          // Optional custom comments
          comments: "Great!\nAwesome\nLove it",
          // Optional mentions/usernames
          mentions: "@user1 @user2",
        },
        multiBody: {
          orders: [
            { service: "service_id_1", link: "https://...", quantity: 1000 },
            { service: "service_id_2", link: "https://...", quantity: 500 },
          ],
        },
        response: {
          status: "success",
          order: "A-10432",
          service: "Instagram · Followers HQ",
          quantity: 1000,
          price: 2.4,
          status: "processing",
          message: "Order placed successfully",
        },
        notes: [
          "Drip-feed: set 'runs' (number of chunks) and 'interval' (e.g. '10m', '1h', '30s')",
          "Total quantity = quantity × runs. Must not exceed service max.",
          "Multi-order: pass { orders: [...] } for bulk creation (max 100).",
          "Returns 402 if insufficient balance.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/status",
        description: "Query order status (single or multi)",
        permission: "read",
        params: {
          order: "A-10432 (single order ID)",
          orders: "A-10432,A-10433,A-10434 (comma-separated, up to 100)",
        },
        response: {
          status: "success",
          order: "A-10432",
          service: "Instagram · Followers HQ",
          link: "https://...",
          quantity: 1000,
          charge: 2.4,
          start_count: 0,
          status: "In progress",
          remains: 500,
          currency: "USD",
        },
        statusValues: [
          "Processing", "In progress", "Completed", "Partial", "Canceled",
        ],
      },
      {
        method: "POST",
        path: "/api/v1/cancel",
        description: "Cancel one or more orders (with full refund, within 60s of placement)",
        permission: "order",
        body: { order: "A-10432" },
        multiBody: { orders: ["A-10432", "A-10433"] },
        response: {
          status: "success",
          order: "A-10432",
          refunded: 2.4,
          currency: "USD",
        },
        notes: [
          "Only pending/processing orders can be cancelled (not in_progress/completed).",
          "Cancel window: 60 seconds after order placement.",
          "Full refund to balance on success.",
        ],
      },

      // ── Refills ──
      {
        method: "POST",
        path: "/api/v1/refill",
        description: "Request a refill (re-delivery) for completed orders where count dropped",
        permission: "order",
        body: { order: "A-10432" },
        multiBody: { orders: ["A-10432", "A-10433"] },
        response: {
          status: "success",
          refill: "T-100",
          order: "A-10432",
        },
        notes: [
          "Only completed orders within 30 days of completion can be refilled.",
          "Only 1 active refill request per order at a time.",
          "The refill ID (T-XXX) is a ticket ID — use it to query status.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/refill_status",
        description: "Query the status of refill requests (single or multi)",
        permission: "read",
        params: {
          refill: "T-100 (single refill ID)",
          refills: "T-100,T-101,T-102 (comma-separated, up to 100)",
        },
        response: {
          status: "success",
          refill: "T-100",
          order: "A-10432",
          refill_status: "In Progress",
          created_at: "2026-01-15T10:30:00.000Z",
          updated_at: "2026-01-15T10:35:00.000Z",
        },
        refillStatusValues: [
          "Pending", "In Progress", "Completed", "Rejected", "Canceled",
        ],
      },

      // ── Balance ──
      {
        method: "GET",
        path: "/api/v1/balance",
        description: "Get account balance",
        permission: "read",
        response: {
          status: "success",
          balance: 125.5,
          currency: "USD",
        },
      },

      // ── Public (no auth) ──
      {
        method: "GET",
        path: "/api/status",
        description: "Platform status (no auth required)",
        auth: false,
      },
      {
        method: "POST",
        path: "/api/public/validate-license",
        description: "Validate a panel license (no auth required)",
        auth: false,
        body: { licenseKey: "NOVSMM-XXXX-XXXX-XXXX-XXXX" },
      },
    ],
    examples: {
      curl: {
        services: 'curl -H "Authorization: Bearer nvsk_live_xxx" https://api.novsmm.com/api/v1/services',
        placeOrder: 'curl -X POST -H "Authorization: Bearer nvsk_live_xxx" -H "Content-Type: application/json" -d \'{"service":"abc123","link":"https://instagram.com/post","quantity":1000}\' https://api.novsmm.com/api/v1/orders',
        orderStatus: 'curl -H "Authorization: Bearer nvsk_live_xxx" "https://api.novsmm.com/api/v1/status?order=A-10432"',
        multiStatus: 'curl -H "Authorization: Bearer nvsk_live_xxx" "https://api.novsmm.com/api/v1/status?orders=A-10432,A-10433"',
        balance: 'curl -H "Authorization: Bearer nvsk_live_xxx" https://api.novsmm.com/api/v1/balance',
        cancel: 'curl -X POST -H "Authorization: Bearer nvsk_live_xxx" -H "Content-Type: application/json" -d \'{"order":"A-10432"}\' https://api.novsmm.com/api/v1/cancel',
        refill: 'curl -X POST -H "Authorization: Bearer nvsk_live_xxx" -H "Content-Type: application/json" -d \'{"order":"A-10432"}\' https://api.novsmm.com/api/v1/refill',
        refillStatus: 'curl -H "Authorization: Bearer nvsk_live_xxx" "https://api.novsmm.com/api/v1/refill_status?refill=T-100"',
      },
    },
    rateLimits: {
      general: "120 requests/min per IP",
      auth: "5 requests/15min per IP",
      wallet: "10 requests/min per IP",
      orders: "20 requests/min per IP",
      apiV1: "60 requests/min per API key",
    },
    errors: {
      401: "Invalid or missing API key",
      402: "Insufficient balance",
      403: "Missing permission or CSRF check failed",
      404: "Service not found",
      422: "Invalid input",
      429: "Rate limit exceeded",
      500: "Server error",
    },
  });
}
