import Link from "next/link";
import { getReturnById } from "@/app/actions/return-actions";
import { formatMoney } from "@/lib/pos/format";

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rtn = await getReturnById(Number(id));
  if (!rtn) {
    return <p>Return not found.</p>;
  }

  return (
    <section className="stack">
      <h1>Return #{rtn.id}</h1>
      <section className="card">
        <p>Sale: #{rtn.saleId}</p>
        <p>Date: {new Date(rtn.createdAt).toLocaleString("en-LK")}</p>
        {rtn.note ? <p>Note: {rtn.note}</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {rtn.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.quantity}</td>
                  <td>{formatMoney(line.unitPrice, "LKR", "en-LK")}</td>
                  <td>{formatMoney(line.lineTotal, "LKR", "en-LK")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="totals">
          <p>Subtotal: {formatMoney(rtn.subtotal, "LKR", "en-LK")}</p>
          <p>Adjustment: {formatMoney(rtn.adjustment, "LKR", "en-LK")}</p>
          <p>Total Refund: {formatMoney(rtn.totalRefund, "LKR", "en-LK")}</p>
        </div>
        <h3>Refund Payments</h3>
        <ul>
          {rtn.payments.map((payment) => (
            <li key={payment.id}>
              {payment.method}: {formatMoney(payment.amount, "LKR", "en-LK")}
            </li>
          ))}
        </ul>
        <Link className="btn" href={`/returns/${rtn.id}/receipt`}>
          Refund Receipt
        </Link>
      </section>
    </section>
  );
}

