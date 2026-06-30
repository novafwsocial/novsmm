import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiOk, apiError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/webhooks/mercadopago — Mercado Pago webhook handler.
 *
 * In production:
 * 1. Set up webhook in MP dashboard → https://yourdomain.com/api/webhooks/mercadopago
 * 2. Verify the x-signature header against your MP webhook secret
 * 3. Fetch the payment details: GET /v1/payments/{id} with your access token
 *
 * Currently runs in "log mode" — records all webhooks for audit.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-signature");

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const log = await db.webhookLog.create({
    data: {
      provider: "mercadopago",
      eventType: event.type ?? event.action ?? "unknown",
      payload: body,
      signature,
      status: "received",
    },
  });

  try {
    // MP sends { type: "payment", data: { id: "123456" } }
    if (event.type === "payment" && event.data?.id) {
      const paymentId = String(event.data.id);

      // In production: fetch the payment status from MP API
      // const mp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      //   headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      // });
      // const payment = await mp.json();

      // Find transaction by reference
      const txn = await db.transaction.findFirst({
        where: { reference: paymentId },
      });
      if (txn && txn.status === "pending") {
        await db.$transaction([
          db.transaction.update({
            where: { id: txn.id },
            data: { status: "completed", reference: paymentId },
          }),
          db.user.update({
            where: { id: txn.userId },
            data: {
              balance: { increment: txn.amount },
              lifetimeEarnings: { increment: txn.amount },
            },
          }),
        ]);

        await createNotification({
          userId: txn.userId,
          type: "recharge",
          title: "Pago confirmado ✅",
          message: `$${txn.amount.toFixed(2)} confirmado via Mercado Pago. ID: ${paymentId}`,
          amount: txn.amount,
          severity: "success",
          sendEmail: true,
        });
      }
    }

    await db.webhookLog.update({
      where: { id: log.id },
      data: { status: "processed" },
    });

    return apiOk({ received: true });
  } catch (e: any) {
    await db.webhookLog.update({
      where: { id: log.id },
      data: { status: "failed", error: e.message },
    });
    return apiError("Webhook processing failed", 500);
  }
}
