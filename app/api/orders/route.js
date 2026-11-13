import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  initiateStkPush,
  isMpesaConfigured,
  normalizePhone,
} from "@/lib/mpesa";

// Converts total cents (USD-style minor units) to whole KES for M-Pesa.
// We treat stored prices as a KES-equivalent amount: cents/100 rounded up to
// at least 1 KES, since M-Pesa only accepts whole shillings.
function centsToKes(totalCents) {
  return Math.max(1, Math.round(totalCents / 100));
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    customerName,
    customerEmail,
    shippingAddress,
    items,
    paymentMethod = "test",
    phone,
  } = body || {};

  // Basic validation at the system boundary.
  if (
    !customerName?.trim() ||
    !customerEmail?.trim() ||
    !shippingAddress?.trim()
  ) {
    return NextResponse.json(
      { error: "Name, email, and shipping address are required." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  if (!["test", "mpesa"].includes(paymentMethod)) {
    return NextResponse.json(
      { error: "Unsupported payment method." },
      { status: 400 }
    );
  }

  let normalizedPhone = null;
  if (paymentMethod === "mpesa") {
    if (!isMpesaConfigured()) {
      return NextResponse.json(
        { error: "M-Pesa is not configured on the server yet." },
        { status: 503 }
      );
    }
    normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Enter a valid Kenyan phone number, e.g. 0712345678." },
        { status: 400 }
      );
    }
  }

  // Re-fetch products from the DB so prices come from the server, never the client.
  const ids = items.map((i) => i.id);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const orderItems = [];
  let totalCents = 0;

  for (const item of items) {
    const product = productMap.get(item.id);
    if (!product) {
      return NextResponse.json(
        { error: `A product in your cart no longer exists.` },
        { status: 400 }
      );
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Invalid quantity in cart." },
        { status: 400 }
      );
    }
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Not enough stock for ${product.name}.` },
        { status: 400 }
      );
    }
    totalCents += product.priceCents * quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity,
    });
  }

  // --- TEST MODE: behave as before (instant paid + stock decrement) ---
  if (paymentMethod === "test") {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          shippingAddress: shippingAddress.trim(),
          totalCents,
          status: "paid",
          paymentMethod: "test",
          paymentStatus: "paid",
          stockReduced: true,
          items: { create: orderItems },
        },
      });
      for (const oi of orderItems) {
        await tx.product.update({
          where: { id: oi.productId },
          data: { stock: { decrement: oi.quantity } },
        });
      }
      return created;
    });

    return NextResponse.json(
      { orderId: order.id, totalCents, paymentMethod: "test", paymentStatus: "paid" },
      { status: 201 }
    );
  }

  // --- M-PESA: create pending order, then push STK prompt to the buyer ---
  const order = await prisma.order.create({
    data: {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      shippingAddress: shippingAddress.trim(),
      totalCents,
      status: "pending",
      paymentMethod: "mpesa",
      paymentStatus: "pending",
      phone: normalizedPhone,
      stockReduced: false,
      items: { create: orderItems },
    },
  });

  try {
    const result = await initiateStkPush({
      phone: normalizedPhone,
      amount: centsToKes(totalCents),
      accountRef: order.id.slice(0, 12),
      description: "Store order",
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { checkoutRequestId: result.checkoutRequestId },
    });

    return NextResponse.json(
      {
        orderId: order.id,
        totalCents,
        paymentMethod: "mpesa",
        paymentStatus: "pending",
        checkoutRequestId: result.checkoutRequestId,
        message:
          result.customerMessage ||
          "Check your phone and enter your M-Pesa PIN to complete payment.",
      },
      { status: 201 }
    );
  } catch (err) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "failed",
        status: "failed",
        paymentDetail: String(err.message).slice(0, 500),
      },
    });
    return NextResponse.json(
      { error: `Could not start M-Pesa payment: ${err.message}` },
      { status: 502 }
    );
  }
}
