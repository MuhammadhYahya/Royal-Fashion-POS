"use client";

import { formatMoney } from "@/lib/pos/format";

type POSTotalsProps = {
  subtotal: number;
  discount: number;
  total: number;
  paymentTotal: number;
  changeAmount: number;
  amountDue: number;
  nonCashOver: number;
};

export function POSTotals({
  subtotal,
  discount,
  total,
  paymentTotal,
  changeAmount,
  amountDue,
  nonCashOver,
}: POSTotalsProps) {
  return (
    <section className="card totals-card">
      <header className="section-head">
        <h2>Totals</h2>
      </header>

      <div className="totals-main">
        <p>
          Subtotal
          <strong>{formatMoney(subtotal, "LKR", "en-LK")}</strong>
        </p>
        <p>
          Discount
          <strong>{formatMoney(discount, "LKR", "en-LK")}</strong>
        </p>
        <p className="grand-total">
          Total
          <strong>{formatMoney(total, "LKR", "en-LK")}</strong>
        </p>
      </div>

      <div className="totals-mini">
        <p>
          Paid <strong>{formatMoney(paymentTotal, "LKR", "en-LK")}</strong>
        </p>
        <p>
          Change <strong>{formatMoney(changeAmount, "LKR", "en-LK")}</strong>
        </p>
        <p>
          Due <strong>{formatMoney(amountDue, "LKR", "en-LK")}</strong>
        </p>
        {nonCashOver > 0 ? (
          <p className="text-danger">
            Non-cash over by{" "}
            <strong>{formatMoney(nonCashOver, "LKR", "en-LK")}</strong>
          </p>
        ) : null}
      </div>
    </section>
  );
}
