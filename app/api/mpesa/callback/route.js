import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Safaricom calls this URL with the STK Push result.
// It must always return a 200 with the acknowledgement shape Daraja expects,
// otherwise Safaricom retries.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const stk = body?.Body?.stkCallback;
  if (!stk) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const checkoutRequestId = stk.CheckoutRequestID;
  const resultCode = Number(stk.ResultCode);
  const resultDesc = stk.ResultDesc || "";

  const order = await prisma.order.findUnique({
    where: { checkoutRequestId },
    include: { items: true },
  });

  // Unknown order (or already handled) — acknowledge and stop.
  if (!order) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  if (resultCode === 0) {
    // Success: pull the receipt from the callback metadata.
    const meta = stk.CallbackMetadata?.Item || [];
    const getVal = (name) =>
      meta.find((i) => i.Name === name)?.Value ?? null;
    const receipt = getVal("MpesaReceiptNumber");

    // Mark paid and decrement stock atomically, guarding against double runs.
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({ where: { id: order.id } });
      if (!fresh || fresh.stockReduced || fresh.paymentStatus === "paid") return;

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "paid",
          paymentStatus: "paid",
          mpesaReceipt: receipt ? String(receipt) : null,
          paymentDetail: resultDesc.slice(0, 500),
          stockReduced: true,
        },
      });
      for (const oi of order.items) {
        await tx.product.update({
          where: { id: oi.productId },
          data: { stock: { decrement: oi.quantity } },
        });
      }
    });
  } else {
    // Failure or cancellation by the buyer.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
        paymentStatus: "failed",
        paymentDetail: resultDesc.slice(0, 500),
      },
    });
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
