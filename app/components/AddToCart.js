"use client";

import { useState } from "react";
import { useCart } from "../cart-context";

export default function AddToCart({ product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const outOfStock = product.stock <= 0;

  return (
    <button className="btn" onClick={handleAdd} disabled={outOfStock}>
      {outOfStock ? "Out of stock" : added ? "Added \u2713" : "Add to cart"}
    </button>
  );
}
