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

function parseProduct(body) {
  const name = (body?.name || "").trim();
  const description = (body?.description || "").trim();
  const imageUrl = (body?.imageUrl || "").trim();
  const category = (body?.category || "").trim();
  const priceCents = Math.round(Number(body?.priceCents));
  const stock = Math.round(Number(body?.stock));

  if (!name || !description || !imageUrl || !category) {
    return { error: "All fields are required." };
  }
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { error: "Price must be a non-negative number of cents." };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: "Stock must be a non-negative whole number." };
  }
  return {
    data: {
      name,
      description,
      imageUrl,
      category,
      priceCents,
      stock,
      slug: slugify(name),
    },
  };
}

export async function POST(request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const { data, error } = parseProduct(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const product = await prisma.product.create({ data });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "A product with that name already exists." },
        { status: 409 }
      );
    }
    throw e;
  }
}
