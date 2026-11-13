"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "../cart-context";
import { formatPrice } from "@/lib/format";

export default function CheckoutPage() {
  const { items, totalCents, clearCart } = useCart();
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    shippingAddress: "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("test");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  // M-Pesa waiting state
  const [waiting, setWaiting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const pollRef = useRef(null);

  // Clean up the poller if the component unmounts.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function startPolling(orderId) {
    setWaiting(true);
    setStatusMsg(
      "Check your phone \u2014 enter your M-Pesa PIN to approve the payment."
    );
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3;
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        const data = await res.json();
        if (data.paymentStatus === "paid") {
          clearInterval(pollRef.current);
          setWaiting(false);
          setOrder({
            orderId,
            totalCents,
            paymentMethod: "mpesa",
            paymentStatus: "paid",
            mpesaReceipt: data.mpesaReceipt,
          });
          clearCart();
        } else if (data.paymentStatus === "failed") {
          clearInterval(pollRef.current);
          setWaiting(false);
          setError(
            data.paymentDetail ||
              "The M-Pesa payment was not completed. Please try again."
          );
        }
      } catch {
        // transient error, keep polling
      }
      // Stop after ~2 minutes (STK prompts expire).
      if (elapsed >= 120) {
        clearInterval(pollRef.current);
        setWaiting(false);
        setError(
          "Timed out waiting for payment confirmation. If you paid, check your order status shortly."
        );
      }
    }, 3000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          shippingAddress: form.shippingAddress,
          phone: form.phone,
          paymentMethod,
          items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      if (data.paymentMethod === "mpesa") {
        startPolling(data.orderId);
      } else {
        setOrder(data);
        clearCart();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <div className="container">
        <h1 className="section-title">Order confirmed</h1>
        <div className="notice success">
          Thank you! Your order <strong>{order.orderId}</strong> was placed
          successfully. Total: {formatPrice(order.totalCents)}
          {order.paymentMethod === "mpesa" ? (
            <>
              {" "}
              paid via M-Pesa
              {order.mpesaReceipt ? (
                <>
                  {" "}
                  (receipt <strong>{order.mpesaReceipt}</strong>)
                </>
              ) : null}
              .
            </>
          ) : (
            " (test mode)."
          )}
        </div>
        <Link href="/" className="btn">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <h1 className="section-title">Checkout</h1>
        <p className="empty">
          Your cart is empty. <Link href="/">Browse the shop &rarr;</Link>
        </p>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="container">
        <h1 className="section-title">Waiting for payment</h1>
        <div className="notice" style={{ background: "#f5f5f4" }}>
          <div className="spinner" aria-hidden="true" /> {statusMsg}
        </div>
        <p style={{ color: "var(--muted)" }}>
          Keep this page open. It will update automatically once you approve the
          prompt on your phone.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="section-title">Checkout</h1>
      <div className="layout-2col">
        <form onSubmit={handleSubmit}>
          {error && <div className="notice error">{error}</div>}
          <div className="field">
            <label htmlFor="customerName">Full name</label>
            <input
              id="customerName"
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="customerEmail">Email</label>
            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              value={form.customerEmail}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="shippingAddress">Shipping address</label>
            <textarea
              id="shippingAddress"
              name="shippingAddress"
              rows={3}
              value={form.shippingAddress}
              onChange={handleChange}
              required
            />
          </div>

          <fieldset className="pay-methods">
            <legend>Payment method</legend>
            <label className={paymentMethod === "test" ? "pay-opt active" : "pay-opt"}>
              <input
                type="radio"
                name="paymentMethod"
                value="test"
                checked={paymentMethod === "test"}
                onChange={() => setPaymentMethod("test")}
              />
              <span>Test payment (no real charge)</span>
            </label>
            <label className={paymentMethod === "mpesa" ? "pay-opt active" : "pay-opt"}>
              <input
                type="radio"
                name="paymentMethod"
                value="mpesa"
                checked={paymentMethod === "mpesa"}
                onChange={() => setPaymentMethod("mpesa")}
              />
              <span>M-Pesa (STK push to your phone)</span>
            </label>
          </fieldset>

          {paymentMethod === "mpesa" && (
            <div className="field">
              <label htmlFor="phone">M-Pesa phone number</label>
              <input
                id="phone"
                name="phone"
                placeholder="07XXXXXXXX"
                value={form.phone}
                onChange={handleChange}
                required
              />
              <small style={{ color: "var(--muted)" }}>
                A payment prompt will be pushed to this Safaricom number.
              </small>
            </div>
          )}

          {paymentMethod === "test" ? (
            <div className="notice" style={{ background: "#f5f5f4" }}>
              Payment is in <strong>test mode</strong> &mdash; no real card or
              phone is charged.
            </div>
          ) : (
            <div className="notice" style={{ background: "#f5f5f4" }}>
              You&apos;ll get an <strong>M-Pesa prompt</strong> on your phone.
              Enter your PIN to pay {formatPrice(totalCents)}.
            </div>
          )}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting
              ? "Processing\u2026"
              : paymentMethod === "mpesa"
              ? `Pay with M-Pesa`
              : `Pay ${formatPrice(totalCents)}`}
          </button>
        </form>

        <div className="summary" style={{ marginTop: 0 }}>
          <h3 style={{ marginTop: 0 }}>Order summary</h3>
          {items.map((i) => (
            <div className="line" key={i.id}>
              <span>
                {i.name} &times; {i.quantity}
              </span>
              <span>{formatPrice(i.priceCents * i.quantity)}</span>
            </div>
          ))}
          <div className="line total">
            <span>Total</span>
            <span>{formatPrice(totalCents)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
