"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

const emptyForm = {
  name: "",
  description: "",
  category: "",
  imageUrl: "",
  price: "",
  stock: "",
};

export default function AdminPanel({ initialProducts, orders }) {
  const router = useRouter();
  const [products] = useState(initialProducts);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      category: p.category,
      imageUrl: p.imageUrl,
      price: (p.priceCents / 100).toString(),
      stock: p.stock.toString(),
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      imageUrl: form.imageUrl,
      priceCents: Math.round(Number(form.price) * 100),
      stock: Number(form.stock),
    };

    try {
      const url = editingId
        ? `/api/admin/products/${editingId}`
        : "/api/admin/products";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      cancelEdit();
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 className="section-title">Admin</h1>
        <button className="btn outline sm" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <h2 style={{ fontSize: "1.2rem" }}>
        {editingId ? "Edit product" : "Add a product"}
      </h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        {error && <div className="notice error">{error}</div>}
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <input
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="imageUrl">Image URL</label>
          <input
            id="imageUrl"
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="price">Price (USD)</label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="stock">Stock</label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn" type="submit" disabled={busy}>
            {editingId ? "Save changes" : "Add product"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn outline"
              onClick={cancelEdit}
              disabled={busy}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 style={{ fontSize: "1.2rem", marginTop: "2.5rem" }}>
        Products ({products.length})
      </h2>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>{formatPrice(p.priceCents)}</td>
              <td>{p.stock}</td>
              <td>
                <div className="row-actions">
                  <button className="btn outline sm" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button
                    className="btn danger sm"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.2rem", marginTop: "2.5rem" }}>
        Recent orders ({orders.length})
      </h2>
      {orders.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No orders yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id.slice(0, 8)}</td>
                <td>
                  {o.customerName}
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {o.customerEmail}
                  </span>
                </td>
                <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td>{formatPrice(o.totalCents)}</td>
                <td>
                  {o.paymentMethod === "mpesa" ? "M-Pesa" : "Test"}
                  {o.mpesaReceipt ? (
                    <>
                      <br />
                      <span
                        style={{ color: "var(--muted)", fontSize: "0.8rem" }}
                      >
                        {o.mpesaReceipt}
                      </span>
                    </>
                  ) : null}
                </td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
