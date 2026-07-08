import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { sanitizeMessage } from "@/lib/sanitize";
import { nextPublicId } from "@/lib/ids";
import { z } from "zod";

/** GET /api/tickets — list current user's tickets (paginated). */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  // H-5 fix: Add pagination — was returning ALL tickets + messages unbounded
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  try {
    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where: { userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      db.ticket.count({ where: { userId } }),
    ]);

    return apiOk({ tickets, total, page, hasMore: skip + tickets.length < total });
  } catch (e: any) {
    console.error("[tickets] GET error:", e);
    return apiError("Failed to fetch tickets", 500);
  }
}

const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  message: z.string().min(1, "Message is required").max(10000, "Message too long"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

/** POST /api/tickets — create a new ticket. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { subject, message, priority } = parsed.data;
    const publicId = await nextPublicId("T", 201);

    const ticket = await db.ticket.create({
      data: {
        publicId,
        userId,
        subject: sanitizeMessage(subject),
        priority,
        status: "open",
        messages: {
          create: { sender: "user", text: sanitizeMessage(message) },
        },
      },
      include: { messages: true },
    });

    await createNotification({
      type: "ticket",
      title: `New ticket #${publicId}`,
      message: subject,
      severity: "info",
    });

    return apiOk({ ticket, message: "Ticket created" }, 201);
  } catch (e: any) {
    console.error("[tickets] POST error:", e);
    return apiError("Failed to create ticket", 500);
  }
}

const replyTicketSchema = z.object({
  ticketId: z.string().min(1),
  text: z.string().min(1, "Text is required").max(10000, "Text too long"),
});

/** PATCH /api/tickets — add a message to a ticket. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = replyTicketSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { ticketId, text } = parsed.data;

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { userId: true, publicId: true },
    });

    if (!ticket || ticket.userId !== userId) {
      return apiError("Ticket not found", 404);
    }

    const msg = await db.ticketMessage.create({
      data: { ticketId, sender: "user", text: sanitizeMessage(text) },
    });

    await db.ticket.update({
      where: { id: ticketId },
      data: { status: "open", updatedAt: new Date() },
    });

    // Auto-reply from support after a delay (simulated)
    setTimeout(async () => {
      try {
        await db.ticketMessage.create({
          data: {
            ticketId,
            sender: "support",
            text: "Thanks for the update — I'll check and get right back to you.",
          },
        });
        await db.ticket.update({
          where: { id: ticketId },
          data: { status: "waiting", updatedAt: new Date() },
        });
        await createNotification({
          userId,
          type: "ticket",
          title: `Ticket #${ticket.publicId} updated`,
          message: "Support replied to your ticket.",
          severity: "info",
        });
      } catch (e) {
        console.error("[ticket/auto-reply] error:", e);
      }
    }, 2000);

    return apiOk({ message: msg });
  } catch (e: any) {
    console.error("[tickets] PATCH error:", e);
    return apiError("Failed to reply to ticket", 500);
  }
}
