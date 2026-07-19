import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import {
  generateLicenseKey,
  hashLicenseKey,
  encryptLicenseKey,
  decryptLicenseKey,
} from "@/lib/license";
import { createNotification, notifyAdmins } from "@/lib/notify";
import {
  createLicenseSchema,
  updateLicenseSchema,
  LICENSE_PLANS,
} from "@/lib/validations";

/**
 * GET /api/admin/licenses — paginated list of all licenses (admin view).
 * The encrypted licenseKey is decrypted for admin display.
 *
 * PERF FIX (P-H-004): added server-side pagination to avoid loading all
 * licenses on every request. Query params: page (default 1), limit
 * (default 50, max 200).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

  const [licenses, total] = await Promise.all([
    db.license.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.license.count(),
  ]);

  // Decrypt the license key for admin display
  const safe = licenses.map((l) => ({
    id: l.id,
    licenseKey: decryptLicenseKey(l.licenseKey),
    customerName: l.customerName,
    customerEmail: l.customerEmail,
    customerId: l.customerId,
    plan: l.plan,
    status: l.status,
    domain: l.domain,
    ipAllowlist: l.ipAllowlist,
    maxUsers: l.maxUsers,
    maxOrders: l.maxOrders,
    issuedAt: l.issuedAt,
    expiresAt: l.expiresAt,
    createdAt: l.createdAt,
  }));

  return apiOk({
    licenses: safe,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * POST /api/admin/licenses — issue a new license.
 * Generates a unique license key, encrypts it, stores hash.
 *
 * ADMIN-FIX-BATCH-2: now validates the body with `createLicenseSchema`
 * (Zod). The `plan` field is constrained to the canonical enum
 * `["reseller", "agency", "enterprise", "white_label"]` — anything else
 * returns 422 with a clear message instead of persisting an unknown value.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const adminId = user!.id;

  // H-1 fix: safe JSON parse
  let body;
  try { body = await req.json(); } catch { return apiError("Invalid JSON body", 422); }

  // Validate + coerce with Zod. `safeParse` lets us craft a friendlier 422
  // message for the common "bad plan" case.
  const parsed = createLicenseSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Surface the plan enum values explicitly when the user sent an
    // unsupported plan — the generic Zod message would just say
    // "Invalid literal value, expected 'reseller'".
    if (issue.path[0] === "plan") {
      return apiError(
        `Invalid plan. Must be one of: ${LICENSE_PLANS.join(", ")}`,
        422
      );
    }
    return apiError(issue.message, 422);
  }
  const {
    customerName,
    customerEmail,
    customerId,
    plan,
    domain,
    ipAllowlist,
    maxUsers,
    maxOrders,
    expiresAt,
  } = parsed.data;

  // Generate the key
  const licenseKey = generateLicenseKey();
  const licenseHash = await hashLicenseKey(licenseKey);
  const encryptedKey = encryptLicenseKey(licenseKey);
  // SHA-256 of the plaintext key for O(1) lookup at validation time
  // (bcrypt hashes can't be searched by equality, so lookupHash is the index key)
  const lookupHash = crypto
    .createHash("sha256")
    .update(licenseKey)
    .digest("hex");

  const license = await db.license.create({
    data: {
      licenseKey: encryptedKey,
      licenseHash,
      lookupHash,
      customerName,
      customerEmail: customerEmail.toLowerCase(),
      customerId: customerId || null,
      plan,
      status: "active",
      domain: domain || null,
      ipAllowlist: ipAllowlist || null,
      maxUsers,
      maxOrders,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Audit log
  await audit(adminId, "create", "license", license.id, { customerEmail, plan, domain });

  // Notify admins
  await notifyAdmins({
    type: "system",
    title: "New license issued 📋",
    message: `License for ${customerName} (${customerEmail}) — plan: ${plan}. Key: ${licenseKey}`,
    severity: "info",
  });

  // Also notify the customer if they have an account
  if (customerId) {
    await createNotification({
      userId: customerId,
      type: "system",
      title: "Your NOVSMM license is ready 🎉",
      message: `Plan: ${plan}. Your license key: ${licenseKey}. Keep it safe!`,
      severity: "success",
      sendEmail: true,
    });
  }

  return apiOk(
    {
      license: {
        id: license.id,
        licenseKey, // FULL KEY — shown once
        customerName,
        customerEmail,
        plan,
        status: "active",
        domain,
        maxUsers: license.maxUsers,
        maxOrders: license.maxOrders,
        expiresAt: license.expiresAt,
      },
      message: "License issued. Share the key with the customer — it won't be shown again in plaintext.",
    },
    201
  );
}

/**
 * PATCH /api/admin/licenses — update license status (suspend/revoke/activate)
 * or any editable field (plan, domain, ipAllowlist, maxUsers, maxOrders,
 * expiresAt).
 *
 * ADMIN-FIX-BATCH-2: now validates the body with `updateLicenseSchema`
 * (Zod). The `plan` field (if provided) must be one of the canonical enum
 * values, else 422.
 */
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const adminId = user!.id;

  let body;
  try { body = await req.json(); } catch { return apiError("Invalid JSON body", 422); }

  const parsed = updateLicenseSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.path[0] === "plan") {
      return apiError(
        `Invalid plan. Must be one of: ${LICENSE_PLANS.join(", ")}`,
        422
      );
    }
    return apiError(issue.message, 422);
  }

  const { id, action, ...data } = parsed.data;

  if (!id) return apiError("License ID required", 422);

  const updateData: any = {};
  if (action === "suspend") updateData.status = "suspended";
  else if (action === "revoke") updateData.status = "revoked";
  else if (action === "activate") updateData.status = "active";
  if (data.plan !== undefined) updateData.plan = data.plan;
  if (data.domain !== undefined) updateData.domain = data.domain;
  if (data.ipAllowlist !== undefined) updateData.ipAllowlist = data.ipAllowlist;
  if (data.maxUsers !== undefined) updateData.maxUsers = data.maxUsers;
  if (data.maxOrders !== undefined) updateData.maxOrders = data.maxOrders;
  if (data.expiresAt) updateData.expiresAt = new Date(data.expiresAt);

  const license = await db.license.update({ where: { id }, data: updateData });

  await audit(adminId, action || "update", "license", id, updateData);

  // Notify customer of status change
  if (license.customerId && (action === "suspend" || action === "revoke")) {
    await createNotification({
      userId: license.customerId,
      type: "system",
      title: action === "suspend" ? "License suspended" : "License revoked",
      message: `Your NOVSMM license has been ${action === "suspend" ? "suspended" : "revoked"}. Contact support for details.`,
      severity: "warning",
      sendEmail: true,
    });
  }

  return apiOk({ license, message: `License ${action || "updated"}` });
}
