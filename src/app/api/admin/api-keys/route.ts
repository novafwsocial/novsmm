import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { generateApiKey, generateApiPublicId } from "@/lib/license";
import bcrypt from "bcryptjs";

/**
 * GET /api/admin/api-keys — list all API keys (admin view, shows public IDs only).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const keys = await db.apiKey.findMany({
    include: {
      user: { select: { name: true, email: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

  return apiOk({ apiKeys: safe });
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
      permissions: permissions ?? "read,order",
      status: "active",
      ipAllowlist: normalizedAllowlist,
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
