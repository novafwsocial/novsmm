import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/v1/refill_status
 * Public API for resellers — query the status of refill requests.
 * Auth: Bearer nvsk_live_xxx (requires 'read' permission)
 *
 * Query params (PerfectPanel contract):
 *   Single:  ?refill=T-100   (the refill ticket ID returned by POST /refill)
 *   Multi:   ?refills=T-100,T-101,T-102
 *
 * Response (single):
 *   { status, refill: "T-100", order: "A-10432", refill_status }
 *
 * Response (multi):
 *   { status, refills: { "T-100": { refill_status, order }, ... } }
 *
 * Refill status values:
 *   "Pending" | "In Progress" | "Completed" | "Rejected" | "Canceled"
 *
 * Implementation note:
 *   Refills are tracked as tickets with subject prefix "[Refill] {orderPublicId}".
 *   The ticket status maps to the PerfectPanel refill status:
 *     open → Pending
 *     waiting → In Progress
 *     resolved → Completed
 *     closed → Completed (or Canceled if rejected)
 */
function mapRefillStatus(ticketStatus: string): string {
  switch (ticketStatus) {
    case "open":
      return "Pending";
    case "waiting":
      return "In Progress";
    case "resolved":
      return "Completed";
    case "closed":
      return "Completed";
    default:
      return ticketStatus;
  }
}

/**
 * Extract the original order publicId from the ticket subject.
 * Subject format: "[Refill] A-10432 — Instagram Followers HQ"
 */
function extractOrderFromSubject(subject: string): string | null {
  const match = subject.match(/^\[Refill\]\s+(A-\d+)/);
  return match ? match[1] : null;
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiKey(req, "read");
  if (error) return error;
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const single = searchParams.get("refill");
  const multi = searchParams.get("refills");

  // ── Single refill status ──
  if (single) {
    const ticket = await db.ticket.findUnique({
      where: { publicId: single },
      select: {
        publicId: true, userId: true, subject: true, status: true,
        createdAt: true, updatedAt: true,
      },
    });

    if (!ticket || ticket.userId !== userId) {
      return apiOk({
        status: "error",
        refill: single,
        message: "Refill request not found or does not belong to this account",
      }, 200);
    }

    // Verify it's a refill ticket (not a regular support ticket)
    if (!ticket.subject.startsWith("[Refill]")) {
      return apiOk({
        status: "error",
        refill: single,
        message: "ID does not correspond to a refill request",
      }, 200);
    }

    return apiOk({
      status: "success",
      refill: ticket.publicId,
      order: extractOrderFromSubject(ticket.subject),
      refill_status: mapRefillStatus(ticket.status),
      created_at: ticket.createdAt.toISOString(),
      updated_at: ticket.updatedAt.toISOString(),
    });
  }

  // ── Multi-refill status ──
  if (multi) {
    const refillIds = multi.split(",").map((s) => s.trim()).filter(Boolean);
    if (refillIds.length === 0) {
      return apiError("No refill IDs provided", 422);
    }
    if (refillIds.length > 100) {
      return apiError("Maximum 100 refills per request", 422);
    }

    const tickets = await db.ticket.findMany({
      where: { publicId: { in: refillIds }, userId },
      select: {
        publicId: true, subject: true, status: true,
        createdAt: true, updatedAt: true,
      },
    });

    const ticketMap = new Map(tickets.map((t) => [t.publicId, t]));
    const result: Record<string, any> = {};
    for (const id of refillIds) {
      const ticket = ticketMap.get(id);
      if (!ticket) {
        result[id] = { refill_status: "error", error: "Not found" };
      } else if (!ticket.subject.startsWith("[Refill]")) {
        result[id] = { refill_status: "error", error: "Not a refill request" };
      } else {
        result[id] = {
          order: extractOrderFromSubject(ticket.subject),
          refill_status: mapRefillStatus(ticket.status),
        };
      }
    }

    return apiOk({
      status: "success",
      refills: result,
    });
  }

  return apiError("Provide 'refill' (single) or 'refills' (comma-separated multi) query parameter", 422);
}
