import { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { encrypt } from "@/lib/crypto-utils";

/**
 * Child Panels API — white-label sub-panel self-service.
 *
 *   POST /api/child-panels      → purchase / create a new child panel
 *   GET  /api/child-panels      → list the authenticated user's child panels
 *
 * When a user purchases a child panel, a subdomain + API key are
 * auto-provisioned. The child panel runs the same NOVSMM UI on a subdomain
 * (e.g. `acme.novsmm.shop`), uses the parent's catalog and fulfils via the
 * parent's providers. The parent (the reseller) earns a margin on every order
 * placed through the child panel (markupPercent over parent prices).
 *
 * The API key is returned ONCE in plaintext at creation time (same pattern as
 * License keys) — only its bcrypt hash + SHA-256 lookup hash + AES-encrypted
 * form are persisted. The plaintext key is never retrievable again.
 *
 * Pricing (monthly fee):
 *   reseller   $49/mo
 *   agency     $149/mo
 *   enterprise $499/mo
 *
 * Total cost = monthlyFee × (monthlyDays / 30).
 */

const PLAN_FEES: Record<string, number> = {
  reseller: 49,
  agency: 149,
  enterprise: 499,
};

// Subdomain: 3-30 chars, alphanumeric + hyphens, must start/end alphanumeric.
const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

const createChildPanelSchema = z.object({
  name: z.string().min(1).max(50),
  subdomain: z
    .string()
    .min(3)
    .max(30)
    .regex(SUBDOMAIN_RE, "Subdomain must be 3-30 chars, lowercase alphanumeric + hyphens"),
  plan: z.enum(["reseller", "agency", "enterprise"]).default("reseller"),
  // Default 50% — child panel owner gets 50% of NOVSMM's profit
  // (NOVSMM profit = 150% of cost, so child gets 75% of cost, NOVSMM keeps 75% + cost)
  markupPercent: z.number().min(0).max(100).default(50),
  monthlyDays: z.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/child-panels — list the authenticated user's child panels.
 * Newest first, capped at 200. Returns the safe fields only (never the
 * encrypted apiKey / hashes).
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const panels = await db.childPanel.findMany({
    where: {
      userId,
      ...(status && status !== "all" ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      publicId: true,
      name: true,
      subdomain: true,
      plan: true,
      markupPercent: true,
      status: true,
      monthlyFee: true,
      paidUntil: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiOk({ panels });
}

/**
 * POST /api/child-panels — purchase / create a new child panel.
 *
 * Flow:
 *   1. Validate body (name, subdomain, plan, markupPercent, monthlyDays)
 *   2. Compute monthlyFee from plan + totalCost = monthlyFee × monthlyDays / 30
 *   3. Conditional atomic balance debit (race-safe under MVCC)
 *   4. Generate API key: nvsk_child_<20 random bytes hex>
 *      Hash with bcrypt (apiKeyHash) + SHA-256 (lookupHash) + AES encrypt (apiKey)
 *   5. Generate publicId via nextPublicId("CP", 500)
 *   6. Create ChildPanel + ledger transaction + notification + audit
 *   7. Return 201 with the panel object + PLAINTEXT apiKey (shown ONCE)
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  try {
    const body = await req.json();
    const parsed = createChildPanelSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }
    const { name, subdomain, plan, markupPercent, monthlyDays } = parsed.data;

    const monthlyFee = PLAN_FEES[plan] ?? PLAN_FEES.reseller;
    const totalCost = Number(((monthlyFee * monthlyDays) / 30).toFixed(2));

    // ── Pre-flight: subdomain uniqueness (cheap, avoids the heavier tx) ──
    // Lowercase the subdomain one more time (regex already enforces lowercase).
    const normalizedSub = subdomain.toLowerCase();
    const existing = await db.childPanel.findUnique({
      where: { subdomain: normalizedSub },
      select: { id: true },
    });
    if (existing) {
      return apiError("That subdomain is already taken. Try another.", 409);
    }

    // ── Pre-fetch user for status check (debit happens inside tx) ──
    const fresh = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true, status: true },
    });
    if (!fresh) return apiError("User not found", 404);
    if (fresh.status !== "active") return apiError("Account suspended", 403);

    // ── Pre-compute IDs OUTSIDE the tx (nextPublicId opens its own tx) ──
    const publicId = await nextPublicId("CP", 500);
    const txPublicId = await nextPublicId("TX", 8842);

    // ── Generate API key + hashes (CPU-bound, do outside the tx) ──
    const apiKey = `nvsk_child_${crypto.randomBytes(20).toString("hex")}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 12);
    const lookupHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const encryptedApiKey = encrypt(apiKey);

    const paidUntil = new Date(
      Date.now() + monthlyDays * 24 * 60 * 60 * 1000,
    );

    let panel: any;
    try {
      panel = await db.$transaction(async (tx) => {
        // ── Conditional balance debit (race-safe under MVCC) ──
        const updated = await tx.user.updateMany({
          where: { id: userId, balance: { gte: totalCost } },
          data: { balance: { decrement: totalCost } },
        });
        if (updated.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const created = await tx.childPanel.create({
          data: {
            publicId,
            userId,
            name,
            subdomain: normalizedSub,
            apiKey: encryptedApiKey,
            apiKeyHash,
            lookupHash,
            plan,
            markupPercent,
            status: "active",
            monthlyFee,
            paidUntil,
          },
        });

        await tx.transaction.create({
          data: {
            publicId: txPublicId,
            userId,
            type: "sale",
            amount: -totalCost,
            description: `Child panel ${publicId} — ${plan} plan × ${monthlyDays} days`,
            method: "balance",
            reference: publicId,
          },
        });

        return created;
      });
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_BALANCE") {
        const reRead = await db.user.findUnique({
          where: { id: userId },
          select: { balance: true },
        });
        const currentBalance = reRead?.balance ?? 0;
        return apiError(
          `Insufficient balance. Need $${totalCost.toFixed(2)}, have $${currentBalance.toFixed(2)}`,
          402,
        );
      }
      throw e;
    }

    // ── Notification + audit ──
    await createNotification({
      userId,
      type: "system",
      title: `Child panel ${publicId} provisioned 🚀`,
      message: `${name} → https://${normalizedSub}.novsmm.shop · ${plan} plan · ${monthlyDays} days · $${totalCost.toFixed(2)} debited.`,
      amount: -totalCost,
      severity: "success",
      sendEmail: true,
    });

    await audit(userId, "create", "child_panel", panel.id, {
      publicId,
      name,
      subdomain: normalizedSub,
      plan,
      markupPercent,
      monthlyDays,
      total: totalCost,
    });

    return apiOk(
      {
        panel: {
          id: panel.id,
          publicId,
          name,
          subdomain: normalizedSub,
          plan,
          markupPercent,
          status: "active",
          monthlyFee,
          paidUntil,
          createdAt: panel.createdAt,
        },
        apiKey, // FULL KEY — shown once
        message:
          "Child panel provisioned. Save the API key now — it won't be shown again.",
      },
      201,
    );
  } catch (e: any) {
    console.error("[child-panels/create] error:", e);
    return apiError("Failed to create child panel", 500);
  }
}
