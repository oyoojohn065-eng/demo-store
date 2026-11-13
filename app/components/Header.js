"use client";

import Link from "next/link";
import { useCart } from "../cart-context";

export default function Header() {
  const { totalItems } = useCart();
  return (
    <header className="site-header">
      <div className="container inner">
        <Link href="/" className="brand">
          Demo&nbsp;Store
        </Link>
        <nav className="nav">
          <Link href="/">Shop</Link>
          <Link href="/admin">Admin</Link>
          <Link href="/cart" className="cart-link">
            Cart
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
