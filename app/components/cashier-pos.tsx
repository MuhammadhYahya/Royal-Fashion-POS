"use client";

import type { PaymentMethod, Product } from "@prisma/client";
import { useMemo, useState } from "react";
import { formatMinorAsInput, formatMoney, parseCurrencyToMinor } from "@/lib/pos/format";
import { POSCart } from "@/app/components/POSCart";
import { POSProductInput } from "@/app/components/POSProductInput";
import { POSTotals } from "@/app/components/POSTotals";

type CartItem = {
  product: Product;
  quantity: number;
};

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "TRANSFER", "EWALLET"];
const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Bank Transfer",
  EWALLET: "E-Wallet",
};

type NoticeTone = "info" | "success" | "error";

export function CashierPos({ initialProducts }: { initialProducts: Product[] }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountInput, setDiscountInput] = useState("0");
  const [payments, setPayments] = useState<{ method: PaymentMethod; amount: number }[]>([
    { method: "CASH", amount: 0 },
  ]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<NoticeTone>("info");

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return products.slice(0, 12);
    }
    const q = query.toLowerCase();
    return products
      .filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [products, query]);

  const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const total = subtotal - safeDiscount;
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const cashTendered = payments
    .filter((p) => p.method === "CASH")
    .reduce((sum, p) => sum + p.amount, 0);
  const nonCashTotal = payments
    .filter((p) => p.method !== "CASH")
    .reduce((sum, p) => sum + p.amount, 0);
  const requiredCash = Math.max(total - nonCashTotal, 0);
  const amountDue = Math.max(requiredCash - cashTendered, 0);
  const changeAmount = Math.max(cashTendered - requiredCash, 0);
  const nonCashOver = Math.max(nonCashTotal - total, 0);

  const addToCart = (product: Product) => {
    const existing = cart.find((c) => c.product.id === product.id);
    if (!existing) {
      if (product.stock < 1) {
        setMessage("This item is out of stock.");
        setMessageTone("error");
        return false;
      }
      setCart((prev) => [...prev, { product, quantity: 1 }]);
      setMessage("");
      return true;
    }

    if (existing.quantity + 1 > product.stock) {
      setMessage(`Cannot exceed stock for ${product.name}.`);
      setMessageTone("error");
      return false;
    }

    setCart((prev) =>
      prev.map((line) =>
        line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
      ),
    );
    setMessage("");
    return true;
  };

  const addFromSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setMessage("Type a product SKU or name first.");
      setMessageTone("error");
      return;
    }

    const exactSkuMatch = products.find((product) => product.sku.toLowerCase() === q);
    const bestMatch = exactSkuMatch ?? filtered[0];
    if (!bestMatch) {
      setMessage("No matching product found.");
      setMessageTone("error");
      return;
    }

    if (addToCart(bestMatch)) {
      setQuery("");
    }
  };

  const updateQty = (productId: number, qty: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== productId) {
            return c;
          }
          const clamped = Math.min(Math.max(qty, 0), c.product.stock);
          return { ...c, quantity: clamped };
        })
        .filter((c) => c.quantity > 0),
    );
  };

  const changeQty = (productId: number, delta: number) => {
    const item = cart.find((line) => line.product.id === productId);
    if (!item) {
      return;
    }
    updateQty(productId, item.quantity + delta);
  };

  const removeItem = (productId: number) => {
    updateQty(productId, 0);
  };

  const applyDiscount = () => {
    setDiscount(parseCurrencyToMinor(discountInput));
  };

  const cancelSale = () => {
    setCart([]);
    setDiscount(0);
    setDiscountInput("0");
    setPayments([{ method: "CASH", amount: 0 }]);
    setQuery("");
    setMessage("Sale canceled. Start a new bill.");
    setMessageTone("info");
  };

  const submitSale = async () => {
    setMessage("");
    if (cart.length === 0) {
      setMessage("Cart is empty.");
      setMessageTone("error");
      return;
    }

    let submitPayments = payments;
    if (
      payments.length === 1 &&
      payments[0].method === "CASH" &&
      payments[0].amount === 0 &&
      total > 0
    ) {
      submitPayments = [{ ...payments[0], amount: total }];
      setPayments(submitPayments);
    }

    const submitCash = submitPayments
      .filter((p) => p.method === "CASH")
      .reduce((sum, p) => sum + p.amount, 0);
    const submitNonCash = submitPayments
      .filter((p) => p.method !== "CASH")
      .reduce((sum, p) => sum + p.amount, 0);
    const submitRequiredCash = Math.max(total - submitNonCash, 0);

    if (submitNonCash > total) {
      setMessage(
        `Reduce non-cash payment by ${formatMoney(submitNonCash - total, "LKR", "en-LK")}.`,
      );
      setMessageTone("error");
      return;
    }
    if (submitCash < submitRequiredCash) {
      setMessage(
        `Add ${formatMoney(submitRequiredCash - submitCash, "LKR", "en-LK")} more cash.`,
      );
      setMessageTone("error");
      return;
    }

    const normalizedPayments = submitPayments.filter(
      (p) => p.method !== "CASH" && p.amount > 0,
    );
    if (submitRequiredCash > 0 || normalizedPayments.length === 0) {
      normalizedPayments.push({ method: "CASH", amount: submitRequiredCash });
    }

    const payload = {
      lines: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      discount: safeDiscount,
      payments: normalizedPayments,
    };

    let response: Response;
    try {
      response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setMessage("Network error while checking out.");
      setMessageTone("error");
      return;
    }

    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error?.message ?? "Checkout failed.");
      setMessageTone("error");
      return;
    }

    try {
      const productRes = await fetch("/api/products");
      const productBody = await productRes.json();
      if (productRes.ok) {
        setProducts(productBody.data);
      }
    } catch {
      // Keep current UI state if refresh fails.
    }

    setCart([]);
    setDiscount(0);
    setDiscountInput("0");
    setPayments([{ method: "CASH", amount: 0 }]);
    const id = body.data?.id;
    const returnCash = Math.max(submitCash - submitRequiredCash, 0);
    setMessage(
      returnCash > 0
        ? `Sale #${id} completed. Return ${formatMoney(returnCash, "LKR", "en-LK")}.`
        : `Sale #${id} completed.`,
    );
    setMessageTone("success");
  };

  return (
    <div className="cashier-layout">
      {message ? (
        <div style={{gridColumn: "1 / -1", flexShrink: 0, width: "100%"}}>
          <p className={`notice notice-${messageTone} mb-4`}>{message}</p>
        </div>
      ) : null}
      
      <div className="cashier-main">
        <POSProductInput
          query={query}
          products={filtered}
          onQueryChange={setQuery}
          onEnter={addFromSearch}
          onAddItem={addToCart}
        />
      </div>

      <div className="cashier-sidebar">
        <POSCart
          items={cart}
          onIncrease={(productId) => changeQty(productId, 1)}
          onDecrease={(productId) => changeQty(productId, -1)}
          onRemove={removeItem}
        />

        <section className="card pos-panel">
          <header className="section-head">
            <h2>Payment</h2>
            <p>Type in LKR units (example: 1000), not cents.</p>
          </header>

          <label className="field">
            <span>Discount (LKR)</span>
            <div className="row">
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyDiscount();
                  }
                }}
              />
              <button className="btn btn-warning" type="button" onClick={applyDiscount}>
                Apply Discount
              </button>
            </div>
            <small className="field-help">Current: {formatMoney(safeDiscount, "LKR", "en-LK")}</small>
          </label>

          <div className="stack">
            <h3>Payment Methods</h3>
            {payments.map((payment, i) => (
              <div key={`${payment.method}-${i}`} className="payment-grid">
                <label className="field field-compact">
                  <span>Method</span>
                  <select
                    className="input"
                    value={payment.method}
                    onChange={(e) => {
                      const method = e.target.value as PaymentMethod;
                      setPayments((prev) =>
                        prev.map((p, idx) => (idx === i ? { ...p, method } : p)),
                      );
                    }}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {PAYMENT_LABELS[method]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field-compact">
                  <span>Amount (LKR)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={formatMinorAsInput(payment.amount)}
                    onChange={(e) =>
                      setPayments((prev) =>
                        prev.map((p, idx) =>
                          idx === i ? { ...p, amount: parseCurrencyToMinor(e.target.value) } : p,
                        ),
                      )
                    }
                  />
                  <small className="field-help">
                    Display: {formatMoney(payment.amount, "LKR", "en-LK")}
                  </small>
                </label>

                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => setPayments((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="row">
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPayments((prev) => [...prev, { method: "CASH", amount: 0 }])}
            >
              Add Payment Method
            </button>
            <button
              className="btn btn-warning"
              type="button"
              onClick={() => {
                if (payments.length === 0) {
                  setPayments([{ method: "CASH", amount: requiredCash }]);
                  return;
                }
                const firstCashIndex = payments.findIndex((p) => p.method === "CASH");
                if (firstCashIndex === -1) {
                  setPayments((prev) => [...prev, { method: "CASH", amount: requiredCash }]);
                  return;
                }
                setPayments((prev) =>
                  prev.map((p, idx) =>
                    idx === firstCashIndex
                      ? {
                          ...p,
                          amount: requiredCash,
                        }
                      : p,
                  ),
                );
              }}
            >
              Set Exact Cash
            </button>
          </div>

          <div className="row">
            <button
              className="btn btn-success btn-lg"
              type="button"
              onClick={submitSale}
              disabled={cart.length === 0}
            >
              Complete Sale
            </button>
            <button className="btn btn-danger btn-lg" type="button" onClick={cancelSale}>
              Cancel
            </button>
          </div>
        </section>

        <POSTotals
          subtotal={subtotal}
          discount={safeDiscount}
          total={total}
          paymentTotal={paymentTotal}
          changeAmount={changeAmount}
          amountDue={amountDue}
          nonCashOver={nonCashOver}
        />
      </div>
    </div>
  );
}
