import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/** GET /api/favorites — list user's favorite services */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const favorites = await db.favorite.findMany({
      where: { userId },
      include: {
        service: {
          select: { id: true, name: true, platform: true, price: true, quality: true, deliveryTime: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiOk({ favorites });
  } catch (e: any) {
    console.error("[favorites] error:", e);
    // Return empty list instead of 500 to prevent dashboard crash
    return apiOk({ favorites: [] });
  }
}

/** POST /api/favorites — add a favorite */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { serviceId } = body;
  if (!serviceId) return apiError("Service ID is required", 422);

  try {
    const favorite = await db.favorite.create({
      data: { userId, serviceId },
    });
    return apiOk({ favorite, message: "Added to favorites" }, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Already in favorites", 409);
    return apiError("Failed to add favorite", 500);
  }
}

/** DELETE /api/favorites — remove a favorite */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  if (!serviceId) return apiError("Service ID is required", 422);

  await db.favorite.deleteMany({
    where: { userId, serviceId },
  });

  return apiOk({ message: "Removed from favorites" });
}
