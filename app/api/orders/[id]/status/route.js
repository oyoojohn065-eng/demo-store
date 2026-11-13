import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lightweight polling endpoint the checkout page hits while waiting for the
// buyer to approve the M-Pesa prompt.
export async function GET(_request, { params }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      totalCents: true,
      mpesaReceipt: true,
      paymentDetail: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json(order);
}
