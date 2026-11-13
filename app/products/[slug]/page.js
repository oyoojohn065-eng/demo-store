import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import AddToCart from "@/app/components/AddToCart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });

  if (!product) notFound();

  return (
    <div className="container">
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/">&larr; Back to shop</Link>
      </p>
      <div className="product">
        <div className="media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} />
        </div>
        <div>
          <div className="cat">{product.category}</div>
          <h1>{product.name}</h1>
          <div className="price-lg">{formatPrice(product.priceCents)}</div>
          <p className="desc">{product.description}</p>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
            {product.stock > 0
              ? `${product.stock} in stock`
              : "Currently unavailable"}
          </p>
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
}
