import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/docs — API documentation (OpenAPI-style JSON).
 * Documents the public v1 API for reseller integrations.
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
    endpoints: [
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
      {
        method: "POST",
        path: "/api/v1/orders",
        description: "Place a new order",
        permission: "order",
        body: {
          serviceId: "service_id",
          quantity: 1000,
          link: "https://instagram.com/yourpost (optional)",
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
      },
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
    rateLimits: {
      general: "120 requests/min per IP",
      auth: "5 requests/15min per IP",
      wallet: "10 requests/min per IP",
      orders: "20 requests/min per IP",
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
