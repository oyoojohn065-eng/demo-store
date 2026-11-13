import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import AdminLogin from "./AdminLogin";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAuthenticated();

  if (!authed) {
    return (
      <div className="container">
        <h1 className="section-title">Admin login</h1>
        <AdminLogin />
      </div>
    );
  }

  const [products, orders] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { items: true },
    }),
  ]);

  return <AdminPanel initialProducts={products} orders={orders} />;
}
