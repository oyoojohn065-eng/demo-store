"use client";

import Link from "next/link";
import { useCart } from "../cart-context";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalCents } = useCart();

  if (items.length === 0) {
    return (
      <div className="container">
        <h1 className="section-title">Your cart</h1>
        <p className="empty">
          Your cart is empty. <Link href="/">Browse the shop &rarr;</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="section-title">Your cart</h1>
      <div>
        {items.map((item) => (
          <div key={item.id} className="cart-row">
            <div className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.name} />
            </div>
            <div className="info">
              <Link href={`/products/${item.slug}`}>
                <strong>{item.name}</strong>
              </Link>
              <div style={{ color: "var(--muted)" }}>
                {formatPrice(item.priceCents)}
              </div>
            </div>
            <div className="qty">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                aria-label="Decrease quantity"
              >
                &minus;
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <div style={{ width: 90, textAlign: "right", fontWeight: 600 }}>
              {formatPrice(item.priceCents * item.quantity)}
            </div>
            <button
              className="btn outline sm"
              onClick={() => removeItem(item.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="summary" style={{ maxWidth: 360, marginLeft: "auto" }}>
        <div className="line total">
          <span>Total</span>
          <span>{formatPrice(totalCents)}</span>
        </div>
        <Link
          href="/checkout"
          className="btn"
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
