import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function PUT(request, { params }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const name = (body?.name || "").trim();
  const description = (body?.description || "").trim();
  const imageUrl = (body?.imageUrl || "").trim();
  const category = (body?.category || "").trim();
  const priceCents = Math.round(Number(body?.priceCents));
  const stock = Math.round(Number(body?.stock));

  if (!name || !description || !imageUrl || !category) {
    return NextResponse.json(
      { error: "All fields are required." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: "Invalid price." }, { status: 400 });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "Invalid stock." }, { status: 400 });
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        imageUrl,
        category,
        priceCents,
        stock,
        slug: slugify(name),
      },
    });
    return NextResponse.json(product);
  } catch (e) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "A product with that name already exists." },
        { status: 409 }
      );
    }
    throw e;
  }
}

export async function DELETE(request, { params }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    // Product referenced by an order: block deletion to preserve order history.
    if (e.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete a product that appears in existing orders." },
        { status: 409 }
      );
    }
    throw e;
  }
}
