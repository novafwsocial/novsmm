import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/** GET /api/tickets — list current user's tickets. */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const tickets = await db.ticket.findMany({
    where: { userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return apiOk({ tickets });
}

/** POST /api/tickets — create a new ticket. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { subject, message, priority } = body;

  if (!subject || !message) {
    return apiError("Subject and message are required", 422);
  }

  const ticketCount = await db.ticket.count();
  const publicId = `T-${201 + ticketCount}`;

  const ticket = await db.ticket.create({
    data: {
      publicId,
      userId,
      subject,
      priority: priority ?? "medium",
      status: "open",
      messages: {
        create: { sender: "user", text: message },
      },
    },
    include: { messages: true },
  });

  // Notify admins (broadcast)
  await createNotification({
    type: "ticket",
    title: `New ticket #${publicId}`,
    message: subject,
    severity: "info",
  });

  return apiOk({ ticket, message: "Ticket created" }, 201);
}

/** PATCH /api/tickets — add a message to a ticket. */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { ticketId, text } = body;

  if (!ticketId || !text) {
    return apiError("Ticket ID and text are required", 422);
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { userId: true, publicId: true },
  });

  if (!ticket || ticket.userId !== userId) {
    return apiError("Ticket not found", 404);
  }

  const msg = await db.ticketMessage.create({
    data: { ticketId, sender: "user", text },
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
}
