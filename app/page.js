import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="container">
      <section className="hero">
        <h1>Shop our collection</h1>
        <p>Well-made everyday goods, delivered to your door.</p>
      </section>

      {products.length === 0 ? (
        <p className="empty">
          No products yet. Add some in the <Link href="/admin">admin area</Link>{" "}
          or run the seed script.
        </p>
      ) : (
        <div className="grid">
          {products.map((p) => (
            <Link key={p.id} href={`/products/${p.slug}`} className="card">
              <div className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.name} />
              </div>
              <div className="body">
                <div className="cat">{p.category}</div>
                <h3>{p.name}</h3>
                <div className="price">{formatPrice(p.priceCents)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
