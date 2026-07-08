import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * /api/services/[id]/reviews
 *
 * GET  — list reviews for a service. Public to authenticated users (the
 *        marketplace is gated by session at the route level already).
 *        Returns the most recent reviews (limit=50, page=1 by default)
 *        with the reviewer's display name + username, the star rating,
 *        optional comment, and creation date. Also includes aggregate
 *        stats: average rating (1-5, rounded to 1 decimal) + total count.
 *
 * POST — create a review. Auth required. Rules:
 *          1. The service must exist and be active.
 *          2. The caller must have at least one COMPLETED order for this
 *             service (you can only rate services you've actually used).
 *          3. One review per user per service — the unique
 *             [serviceId, userId] constraint enforces this at the DB
 *             level; the API returns a clear 409 when violated.
 *          4. rating must be an integer 1-5; comment is optional (≤2000
 *             chars).
 */

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") ?? "50") || 50),
  );
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const service = await db.service.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!service || service.status === "deleted") {
    return apiError("Service not found", 404);
  }

  // Pull the most recent reviews + the reviewer's display info.
  const reviews = await db.serviceReview.findMany({
    where: { serviceId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
    },
  });

  // Aggregate stats — done in a single grouped query.
  const agg = await db.serviceReview.aggregate({
    where: { serviceId: id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return apiOk({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        name: r.user.name ?? r.user.username,
        username: r.user.username,
        image: r.user.image,
      },
    })),
    stats: {
      average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      count: agg._count.rating,
    },
    pagination: { page, limit },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Invalid input",
        422,
      );
    }
    const { rating, comment } = parsed.data;

    // Service must exist + be visible.
    const service = await db.service.findUnique({
      where: { id },
      select: { id: true, status: true, name: true },
    });
    if (!service || service.status === "deleted") {
      return apiError("Service not found", 404);
    }

    // Eligibility: the caller must have at least one completed order for
    // this service. Reviews from buyers who never received delivery would
    // pollute the rating signal.
    const completedOrder = await db.order.findFirst({
      where: {
        userId,
        serviceId: id,
        status: "completed",
      },
      select: { id: true },
    });
    if (!completedOrder) {
      return apiError(
        "You can only review services you have a completed order for",
        403,
      );
    }

    // Upsert so a re-submit (e.g. user edits their rating) updates the
    // existing row instead of erroring. The unique [serviceId, userId]
    // constraint makes this safe.
    const review = await db.serviceReview.upsert({
      where: {
        serviceId_userId: {
          serviceId: id,
          userId,
        },
      },
      create: {
        serviceId: id,
        userId,
        rating,
        comment: comment?.trim() || null,
      },
      update: {
        rating,
        comment: comment?.trim() || null,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "create",
        entity: "service_review",
        entityId: review.id,
        metadata: JSON.stringify({
          serviceId: id,
          serviceName: service.name,
          rating,
          hasComment: !!comment,
        }),
      },
    });

    return apiOk(
      {
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
          user: {
            id: review.user.id,
            name: review.user.name ?? review.user.username,
            username: review.user.username,
            image: review.user.image,
          },
        },
        message: "Review saved — thanks for your feedback!",
      },
      201,
    );
  } catch (e: any) {
    console.error("[services/reviews] error:", e);
    return apiError("Failed to save review", 500);
  }
}
