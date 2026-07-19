import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { sanitizeText } from "@/lib/sanitize";

/**
 * Sub-Accounts API.
 *
 * A sub-account is a child of a parent user (e.g. an employee) with
 * restricted permissions. Sub-accounts share the parent's wallet balance
 * (no separate balance row — the auth.ts session callback overrides the
 * sub-account's `balance` with the parent's balance on every JWT refresh).
 *
 * Permission shape (stored as JSON string in `subAccountPermissions`):
 *   { orders: true, wallet: false, tickets: true, profile: false }
 *
 * Routes:
 *   GET    /api/me/sub-accounts           — list the caller's sub-accounts
 *   POST   /api/me/sub-accounts           — create a new sub-account
 *   PATCH  /api/me/sub-accounts           — update a sub-account's permissions
 *   DELETE /api/me/sub-accounts           — remove a sub-account
 *
 * Only the parent (the user who created the sub-account) can manage it.
 * Sub-accounts themselves cannot call these routes (parentAccountId is null).
 */

const ALLOWED_PERMISSION_KEYS = ["orders", "wallet", "tickets", "profile"] as const;
type PermissionKey = (typeof ALLOWED_PERMISSION_KEYS)[number];
type Permissions = Record<PermissionKey, boolean>;

function normalizePermissions(input: unknown): Permissions {
  const out: Permissions = { orders: false, wallet: false, tickets: false, profile: false };
  if (input && typeof input === "object") {
    for (const k of ALLOWED_PERMISSION_KEYS) {
      const v = (input as Record<string, unknown>)[k];
      out[k] = v === true;
    }
  }
  return out;
}

/** GET /api/me/sub-accounts — list the caller's sub-accounts. */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const parentId = (session!.user as any).id;

  const subAccounts = await db.user.findMany({
    where: { parentAccountId: parentId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      status: true,
      subAccountPermissions: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Hydrate permissions from JSON string → object for the client.
  const hydrated = subAccounts.map((s) => ({
    ...s,
    permissions: normalizePermissions(
      s.subAccountPermissions ? safeParse(s.subAccountPermissions) : null,
    ),
    subAccountPermissions: undefined,
  }));

  return apiOk({ subAccounts: hydrated });
}

/** POST /api/me/sub-accounts — create a new sub-account. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const parentId = (session!.user as any).id;

  // ── Sub-accounts can't create their own sub-accounts (no nesting) ──
  if ((session!.user as any).parentAccountId) {
    return apiError("Sub-accounts cannot create their own sub-accounts", 403);
  }

  const body = await req.json().catch(() => ({}));
  const name = sanitizeText(typeof body.name === "string" ? body.name : "");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const permissions = normalizePermissions(body.permissions);

  if (!name || name.length < 2) {
    return apiError("Name must be at least 2 characters", 422);
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return apiError("A valid email is required", 422);
  }
  if (password.length < 8) {
    return apiError("Password must be at least 8 characters", 422);
  }

  // ── Uniqueness checks ──
  // Email + username must be unique. We auto-derive a username from the
  // email local-part, falling back to a random suffix on collision.
  const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || "sub";
  let username = baseUsername;
  // Try up to 10 suffixes to find a unique username.
  for (let i = 0; i < 10; i++) {
    const existing = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (!existing) break;
    username = `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
  }

  const existingEmail = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existingEmail) {
    return apiError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const sub = await db.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        role: "sub",
        status: "active",
        // Sub-accounts inherit the parent's currency/country/language so
        // the UI renders consistently without an extra round-trip.
        currency: (session!.user as any).currency ?? "USD",
        country: (session!.user as any).country ?? "Mexico",
        language: (session!.user as any).language ?? "English",
        plan: "free",
        balance: 0,
        // ── Sub-account link + permissions ──
        parentAccountId: parentId,
        subAccountPermissions: JSON.stringify(permissions),
        // Auto-verify the sub-account's email — the parent created it,
        // so we trust the email and skip the email-verification flow
        // (the auth.ts login gate would otherwise block sub-account login).
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await db.auditLog.create({
      data: {
        userId: parentId,
        action: "create",
        entity: "user",
        entityId: sub.id,
        metadata: JSON.stringify({
          type: "sub_account",
          email,
          name,
          permissions,
        }),
      },
    });

    return apiOk(
      {
        subAccount: { ...sub, permissions },
        message: "Sub-account created",
      },
      201,
    );
  } catch (e: any) {
    if (e?.code === "P2002") {
      return apiError("Username or email already exists", 409);
    }
    console.error("[sub-accounts/create] error:", e);
    return apiError("Failed to create sub-account", 500);
  }
}

/** PATCH /api/me/sub-accounts — update a sub-account's permissions. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const parentId = (session!.user as any).id;

  const body = await req.json().catch(() => ({}));
  const subAccountId = typeof body.subAccountId === "string" ? body.subAccountId : null;
  if (!subAccountId) {
    return apiError("subAccountId is required", 422);
  }

  // Verify ownership — the sub-account must belong to the caller.
  const sub = await db.user.findUnique({
    where: { id: subAccountId },
    select: { id: true, parentAccountId: true, name: true, email: true },
  });
  if (!sub || sub.parentAccountId !== parentId) {
    return apiError("Sub-account not found", 404);
  }

  const permissions = normalizePermissions(body.permissions);

  await db.user.update({
    where: { id: subAccountId },
    data: { subAccountPermissions: JSON.stringify(permissions) },
  });

  await db.auditLog.create({
    data: {
      userId: parentId,
      action: "update",
      entity: "user",
      entityId: subAccountId,
      metadata: JSON.stringify({
        type: "sub_account_permissions",
        name: sub.name,
        email: sub.email,
        permissions,
      }),
    },
  });

  return apiOk({ message: "Permissions updated", permissions });
}

/** DELETE /api/me/sub-accounts — remove a sub-account. */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const parentId = (session!.user as any).id;

  // subAccountId can arrive via body (api.delete with body) or query
  // param (api.delete without body) — accept both for client flexibility.
  let subAccountId: string | null = null;
  const url = new URL(req.url);
  const queryId = url.searchParams.get("subAccountId") ?? url.searchParams.get("id");
  if (queryId) {
    subAccountId = queryId;
  } else {
    const body = await req.json().catch(() => ({}));
    if (typeof body.subAccountId === "string") subAccountId = body.subAccountId;
  }
  if (!subAccountId) {
    return apiError("subAccountId is required", 422);
  }

  const sub = await db.user.findUnique({
    where: { id: subAccountId },
    select: { id: true, parentAccountId: true, name: true, email: true, username: true },
  });
  if (!sub || sub.parentAccountId !== parentId) {
    return apiError("Sub-account not found", 404);
  }

  // Hard-delete the sub-account. Sub-accounts don't own orders (they
  // place orders on behalf of the parent, but the order row is owned by
  // the parent — sub-account place orders with userId = parent.id), so
  // cascading deletes aren't a concern. If we wanted to preserve
  // history we'd soft-delete instead; for now we hard-delete per spec.
  await db.user.delete({ where: { id: subAccountId } });

  await db.auditLog.create({
    data: {
      userId: parentId,
      action: "delete",
      entity: "user",
      entityId: subAccountId,
      metadata: JSON.stringify({
        type: "sub_account",
        name: sub.name,
        email: sub.email,
        username: sub.username,
      }),
    },
  });

  return apiOk({ message: "Sub-account removed" });
}

/** Best-effort JSON.parse — returns null on any error. */
function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
