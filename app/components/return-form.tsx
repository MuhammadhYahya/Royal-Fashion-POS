"use client";

import type { PaymentMethod } from "@prisma/client";
import { useMemo, useState } from "react";
import { formatMinorAsInput, formatMoney, parseCurrencyToMinor, toInt } from "@/lib/pos/format";
import { RotateCcw, Wallet, Trash2, Plus } from "lucide-react";

type ReturnableLine = {
  saleLineId: number;
  productId: number;
  productName: string;
  soldQty: number;
  alreadyReturned: number;
  remainingQty: number;
  unitPrice: number;
};

const METHODS: PaymentMethod[] = ["CASH", "CARD", "TRANSFER", "EWALLET"];
const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Bank Transfer",
  EWALLET: "E-Wallet",
};

export function ReturnForm({
  saleId,
  lines,
}: {
  saleId: number;
  lines: ReturnableLine[];
}) {
  const [qtyByLineId, setQtyByLineId] = useState<Record<number, number>>({});
  const [adjustment, setAdjustment] = useState(0);
  const [note, setNote] = useState("");
  const [payments, setPayments] = useState<{ method: PaymentMethod; amountInput: string }[]>([
    { method: "CASH", amountInput: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selected = useMemo(
    () =>
      lines
        .map((line) => {
          const quantity = qtyByLineId[line.saleLineId] ?? 0;
          return {
            ...line,
            quantity,
            lineTotal: line.unitPrice * quantity,
          };
        })
        .filter((line) => line.quantity > 0),
    [lines, qtyByLineId],
  );

  const subtotal = selected.reduce((sum, l) => sum + l.lineTotal, 0);
  const safeAdjustment = Math.min(Math.max(adjustment, 0), subtotal);
  const totalRefund = subtotal - safeAdjustment;
  const parsedPayments = useMemo(
    () =>
      payments.map((payment) => {
        const trimmed = payment.amountInput.trim();
        if (!trimmed) {
          return { ...payment, amount: null as number | null };
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
          return { ...payment, amount: null as number | null };
        }
        return { ...payment, amount: parseCurrencyToMinor(trimmed) };
      }),
    [payments],
  );
  const paymentTotal = parsedPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const validationMessage = useMemo(() => {
    if (selected.length === 0) {
      return "Select at least one return line.";
    }

    if (payments.length === 0) {
      return "Add at least one refund method.";
    }

    for (const payment of parsedPayments) {
      if (!payment.amountInput.trim()) {
        return "Refund amount cannot be empty.";
      }
      if (payment.amount === null) {
        return "Enter a valid refund amount.";
      }
      if (payment.amount <= 0) {
        return "Refund amount must be greater than 0.";
      }
      if (payment.amount > totalRefund) {
        return "Refund amount cannot exceed the refundable amount.";
      }
    }

    if (paymentTotal !== totalRefund) {
      return "Refund payout must equal total refund.";
    }

    return "";
  }, [parsedPayments, paymentTotal, payments.length, selected.length, totalRefund]);

  const canSubmit = !isSubmitting && !validationMessage;

  const submitReturn = async () => {
    setMessage("");
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    const normalizedPayments = parsedPayments.map((payment) => ({
      method: payment.method,
      amount: payment.amount ?? 0,
    }));

    setIsSubmitting(true);
    const response = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleId,
        lines: selected.map((line) => ({
          saleLineId: line.saleLineId,
          quantity: line.quantity,
        })),
        adjustment: safeAdjustment,
        note,
        payments: normalizedPayments,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setIsSubmitting(false);
      setMessage(body.error?.message ?? "Return failed.");
      return;
    }
    window.location.href = `/returns/${body.data.id}`;
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="section-head-row mb-4">
          <div className="row" style={{ gap: "0.75rem" }}>
            <RotateCcw className="w-6 h-6 text-primary" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Return Lines</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Sold</th>
                <th>Already Returned</th>
                <th>Remaining</th>
                <th>Unit Price</th>
                <th>Return Qty</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.saleLineId}>
                  <td>{line.productName}</td>
                  <td>{line.soldQty}</td>
                  <td>{line.alreadyReturned}</td>
                  <td>{line.remainingQty}</td>
                  <td>{formatMoney(line.unitPrice, "LKR", "en-LK")}</td>
                  <td>
                    <input
                      className="input input-sm"
                      type="number"
                      min={0}
                      max={line.remainingQty}
                      value={qtyByLineId[line.saleLineId] ?? 0}
                      onChange={(e) =>
                        setQtyByLineId((prev) => ({
                          ...prev,
                          [line.saleLineId]: Math.min(
                            Math.max(toInt(e.target.value), 0),
                            line.remainingQty,
                          ),
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-head-row mb-4">
          <div className="row" style={{ gap: "0.75rem" }}>
            <Wallet className="w-6 h-6 text-primary" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Refund Information</h2>
          </div>
        </div>
        <p className="text-muted mb-4">Enter money in LKR units (example: 1000 for 1,000.00).</p>
        <div className="stack">
          <label className="field">
            <span>Adjustment (LKR)</span>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={formatMinorAsInput(adjustment)}
              onChange={(e) => setAdjustment(parseCurrencyToMinor(e.target.value))}
            />
            <small className="field-help">Current: {formatMoney(safeAdjustment, "LKR", "en-LK")}</small>
          </label>
          <label className="field">
            <span>Note</span>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
            />
          </label>
          {payments.map((payment, i) => (
            <div className="payment-grid" key={`${payment.method}-${i}`}>
              <label className="field field-compact">
                <span>Method</span>
                <select
                  className="input"
                  value={payment.method}
                  onChange={(e) =>
                    setPayments((prev) =>
                      prev.map((p, idx) =>
                        idx === i
                          ? { ...p, method: e.target.value as PaymentMethod }
                          : p,
                      ),
                    )
                  }
                >
                  {METHODS.map((method) => (
                    <option key={method} value={method}>
                      {METHOD_LABELS[method]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-compact">
                <span>Amount (LKR)</span>
                <input
                  className="input"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={payment.amountInput}
                  onChange={(e) =>
                    setPayments((prev) =>
                      prev.map((p, idx) =>
                        idx === i ? { ...p, amountInput: e.target.value } : p,
                      ),
                    )
                  }
                />
              </label>
              <button
                className="btn btn-danger btn-sm row icon-btn"
                type="button"
                style={{ height: "42px", width: "42px" }}
                onClick={() =>
                  setPayments((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            className="btn btn-outline row"
            style={{ width: "fit-content" }}
            type="button"
            onClick={() => setPayments((prev) => [...prev, { method: "CASH", amountInput: "" }])}
          >
            <Plus className="w-4 h-4" />
            <span>Add Refund Method</span>
          </button>
        </div>

        <div className="totals">
          <p>Subtotal: {formatMoney(subtotal, "LKR", "en-LK")}</p>
          <p>Adjustment: {formatMoney(safeAdjustment, "LKR", "en-LK")}</p>
          <p>Total Refund: {formatMoney(totalRefund, "LKR", "en-LK")}</p>
          <p>Refund Payout: {formatMoney(paymentTotal, "LKR", "en-LK")}</p>
        </div>
        <button
          className="btn btn-success btn-lg"
          onClick={submitReturn}
          disabled={!canSubmit}
        >
          Complete Return
        </button>
        {message ? <p className="notice notice-error">{message}</p> : null}
        {!message && validationMessage ? <p className="notice notice-error">{validationMessage}</p> : null}
      </section>
    </div>
  );
}
