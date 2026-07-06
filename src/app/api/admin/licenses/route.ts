import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import {
  generateLicenseKey,
  hashLicenseKey,
  encryptLicenseKey,
  decryptLicenseKey,
} from "@/lib/license";
import { createNotification, notifyAdmins } from "@/lib/notify";

/**
 * GET /api/admin/licenses — list all licenses (admin view).
 * The encrypted licenseKey is decrypted for admin display.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const licenses = await db.license.findMany({
    orderBy: { createdAt: "desc" },
  });

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

  return apiOk({ licenses: safe });
}

/**
 * POST /api/admin/licenses — issue a new license.
 * Generates a unique license key, encrypts it, stores hash.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
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
  } = body;

  if (!customerName || !customerEmail) {
    return apiError("Customer name and email are required", 422);
  }

  // Generate the key
  const licenseKey = generateLicenseKey();
  const licenseHash = await hashLicenseKey(licenseKey);
  const encryptedKey = encryptLicenseKey(licenseKey);

  const license = await db.license.create({
    data: {
      licenseKey: encryptedKey,
      licenseHash,
      customerName,
      customerEmail: customerEmail.toLowerCase(),
      customerId: customerId || null,
      plan: plan ?? "reseller",
      status: "active",
      domain: domain || null,
      ipAllowlist: ipAllowlist || null,
      maxUsers: maxUsers ?? 1,
      maxOrders: maxOrders ?? 10000,
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
 * PATCH /api/admin/licenses — update license status (suspend/revoke/activate).
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, action, ...data } = body;

  if (!id) return apiError("License ID required", 422);

  const updateData: any = {};
  if (action === "suspend") updateData.status = "suspended";
  else if (action === "revoke") updateData.status = "revoked";
  else if (action === "activate") updateData.status = "active";
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
