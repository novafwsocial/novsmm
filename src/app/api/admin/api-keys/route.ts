import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { generateApiKey, generateApiPublicId } from "@/lib/license";
import bcrypt from "bcryptjs";

/**
 * Valid API key permissions.
 * SECURITY FIX (S-M-006): previously `permissions` was accepted as any
 * string from the request body — an admin could inject arbitrary
 * permission strings like "superadmin" or "delete_all". Now the
 * permissions string is validated: each comma-separated value must be
 * one of the known permissions below.
 */
const VALID_PERMISSIONS = ["read", "order", "balance", "refill", "cancel"] as const;
const VALID_PERMISSIONS_SET = new Set(VALID_PERMISSIONS);

function validatePermissions(permissions: string): string | null {
  const parts = permissions.split(",").map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (!VALID_PERMISSIONS_SET.has(p as any)) {
      return null; // invalid permission found
    }
  }
  return parts.join(",");
}

/**
 * GET /api/admin/api-keys — paginated list of all API keys (admin view,
 * shows public IDs only).
 *
 * PERF FIX (P-H-004): added server-side pagination. Query params:
 * page (default 1), limit (default 50, max 200).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

  const [keys, total] = await Promise.all([
    db.apiKey.findMany({
      include: {
        user: { select: { name: true, email: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.apiKey.count(),
  ]);

  // Never expose the hash or the full key — only the publicId
  const safe = keys.map((k) => ({
    id: k.id,
    publicId: k.publicId,
    name: k.name,
    permissions: k.permissions,
    status: k.status,
    lastUsedAt: k.lastUsedAt,
    lastUsedIp: k.lastUsedIp,
    ipAllowlist: k.ipAllowlist,
    createdAt: k.createdAt,
    revokedAt: k.revokedAt,
    user: k.user,
  }));

  return apiOk({
    apiKeys: safe,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * POST /api/admin/api-keys — generate a new API key for a user.
 * Returns the FULL key ONCE (never stored in plaintext — only bcrypt hash).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { userId, name, permissions, ipAllowlist } = body;

  if (!userId || !name) {
    return apiError("User ID and key name are required", 422);
  }

  // SECURITY (S-M-006): validate permissions against the known enum.
  // Default to "read" if not provided.
  const rawPermissions = permissions ?? "read";
  if (typeof rawPermissions !== "string") {
    return apiError("Permissions must be a comma-separated string", 422);
  }
  const validatedPermissions = validatePermissions(rawPermissions);
  if (validatedPermissions === null) {
    return apiError(
      `Invalid permissions. Valid values: ${VALID_PERMISSIONS.join(", ")}`,
      422
    );
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return apiError("User not found", 404);

  // Normalize the IP allowlist: trim, drop empties, store as CSV string
  let normalizedAllowlist: string | null = null;
  if (typeof ipAllowlist === "string" && ipAllowlist.trim().length > 0) {
    const ips = ipAllowlist
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    normalizedAllowlist = ips.length > 0 ? ips.join(",") : null;
  }

  // Generate the full key + public ID
  const fullKey = generateApiKey();
  const publicId = generateApiPublicId();
  const keyHash = await bcrypt.hash(fullKey, 12);
  // SHA-256 of the plaintext key for O(1) lookup at validation time
  // (bcrypt hashes can't be searched by equality, so lookupHash is the index key)
  const lookupHash = crypto.createHash("sha256").update(fullKey).digest("hex");

  const apiKey = await db.apiKey.create({
    data: {
      publicId,
      keyHash,
      lookupHash,
      name,
      userId,
      permissions: validatedPermissions,
      status: "active",
      ipAllowlist: normalizedAllowlist,
      // ASVS V13.1.3: 90-day default expiry — forces key rotation
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  await audit(adminId, "create", "api_key", apiKey.id, { publicId, forUser: user.email, name, ipAllowlist: normalizedAllowlist });

  // Return the full key ONCE — the admin must copy and share it now
  return apiOk(
    {
      apiKey: {
        id: apiKey.id,
        publicId: apiKey.publicId,
        name: apiKey.name,
        permissions: apiKey.permissions,
        status: apiKey.status,
        createdAt: apiKey.createdAt,
      },
      key: fullKey, // FULL KEY — shown once only
      message: "API key created. Copy it now — it won't be shown again.",
    },
    201
  );
}

/**
 * PATCH /api/admin/api-keys — revoke an API key or update its IP allowlist.
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, action, ipAllowlist } = body;

  if (!id) {
    return apiError("API key id is required", 422);
  }

  // Update IP allowlist (action: "update_ip")
  if (action === "update_ip") {
    let normalizedAllowlist: string | null = null;
    if (typeof ipAllowlist === "string" && ipAllowlist.trim().length > 0) {
      const ips = ipAllowlist
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      normalizedAllowlist = ips.length > 0 ? ips.join(",") : null;
    }

    const apiKey = await db.apiKey.update({
      where: { id },
      data: { ipAllowlist: normalizedAllowlist },
    });

    await audit(adminId, "update", "api_key", id, {
      publicId: apiKey.publicId,
      ipAllowlist: normalizedAllowlist,
    });

    return apiOk({ message: "IP allowlist updated", ipAllowlist: normalizedAllowlist });
  }

  // Revoke (action: "revoke")
  if (action !== "revoke") {
    return apiError("Invalid action", 422);
  }

  const apiKey = await db.apiKey.update({
    where: { id },
    data: { status: "revoked", revokedAt: new Date() },
  });

  await audit(adminId, "revoke", "api_key", id, { publicId: apiKey.publicId });

  return apiOk({ message: "API key revoked" });
}
