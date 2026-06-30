import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { apiError } from "@/lib/api-utils";

/**
 * Validate an API key from the Authorization header.
 * Returns the user + apiKey record, or null.
 *
 * The API key format is: nvsk_live_xxxxx
 * We store only a bcrypt hash, so we need to check against all active keys.
 */
export async function validateApiKey(req: NextRequest): Promise<{
  user: any;
  apiKey: any;
} | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7);
  if (!key.startsWith("nvsk_live_")) return null;

  // Get all active API keys (bcrypt hashes can't be searched by equality)
  const keys = await db.apiKey.findMany({
    where: { status: "active" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          balance: true,
          currency: true,
          status: true,
        },
      },
    },
  });

  // Check the key against each hash
  for (const apiKey of keys) {
    const match = await bcrypt.compare(key, apiKey.keyHash);
    if (match) {
      // Check if user is active
      if (apiKey.user.status !== "active") return null;

      // Update last used
      const ip = req.headers.get("x-client-ip") ?? "unknown";
      await db.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date(), lastUsedIp: ip },
      });

      // Check permissions
      const permissions = apiKey.permissions.split(",");

      return { user: apiKey.user, apiKey: { ...apiKey, permissions } };
    }
  }

  return null;
}

/**
 * Require a specific permission on the API key.
 */
export function hasPermission(apiKey: any, permission: string): boolean {
  return apiKey?.permissions?.includes(permission) ?? false;
}

/**
 * API key auth wrapper — returns { user, apiKey, error }
 */
export async function requireApiKey(req: NextRequest, permission: string = "read") {
  const result = await validateApiKey(req);
  if (!result) {
    return {
      user: null,
      apiKey: null,
      error: apiError("Invalid or missing API key", 401),
    };
  }
  if (!hasPermission(result.apiKey, permission)) {
    return {
      user: null,
      apiKey: null,
      error: apiError(`Missing '${permission}' permission`, 403),
    };
  }
  return { ...result, error: null };
}
