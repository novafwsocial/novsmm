import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * POST /api/coupons/validate
 * Validates a coupon code and returns the discount info.
 * Body: { code: "SAVE10", amount: 2.40 }
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { code, amount } = body;

  if (!code) return apiError("Coupon code is required", 422);

  const coupon = await db.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon) return apiError("Invalid coupon code", 404);
  if (coupon.status !== "active") return apiError("This coupon is no longer active", 422);
  if (coupon.usedCount >= coupon.maxUses) return apiError("This coupon has reached its usage limit", 422);
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return apiError("This coupon has expired", 422);

  // Calculate discount
  let discount = 0;
  if (coupon.type === "percent") {
    discount = (amount * coupon.value) / 100;
  } else {
    discount = Math.min(coupon.value, amount);
  }

  return apiOk({
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
    },
  });
}
