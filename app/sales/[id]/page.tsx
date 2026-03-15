import Link from "next/link";
import { getSaleById } from "@/app/actions/sale-actions";
import { formatMoney } from "@/lib/pos/format";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSaleById(Number(id));
  if (!sale) {
    return <p>Sale not found.</p>;
  }

  return (
    <section className="stack">
      <h1>Sale #{sale.id}</h1>
      <section className="card">
        <p>Date: {new Date(sale.createdAt).toLocaleString("en-LK")}</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {sale.saleLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.quantity}</td>
                  <td>{formatMoney(line.unitPrice, "LKR", "en-LK")}</td>
                  <td>{formatMoney(line.lineTotal, "LKR", "en-LK")}</td>
                  <td>{formatMoney(line.lineProfit, "LKR", "en-LK")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="totals">
          <p>Subtotal: {formatMoney(sale.subtotal, "LKR", "en-LK")}</p>
          <p>Discount: {formatMoney(sale.discount, "LKR", "en-LK")}</p>
          <p>Original Total: {formatMoney(sale.total, "LKR", "en-LK")}</p>
          <p>Refunded: {formatMoney(sale.refundedTotal, "LKR", "en-LK")}</p>
          <p>Net Total: {formatMoney(sale.netTotal, "LKR", "en-LK")}</p>
          <p>Original Profit: {formatMoney(sale.profit, "LKR", "en-LK")}</p>
          <p>Net Profit: {formatMoney(sale.netProfit, "LKR", "en-LK")}</p>
        </div>
        {sale.returns.length > 0 ? (
          <>
            <h3>Returns</h3>
            <ul>
              {sale.returns.map((rtn) => (
                <li key={rtn.id}>
                  #{rtn.id} on {new Date(rtn.createdAt).toLocaleString("en-LK")}:{" "}
                  {formatMoney(rtn.totalRefund, "LKR", "en-LK")}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <h3>Payments</h3>
        <ul>
          {sale.payments.map((payment) => (
            <li key={payment.id}>
              {payment.method}: {formatMoney(payment.amount, "LKR", "en-LK")}
            </li>
          ))}
        </ul>
        <div className="row">
          <Link className="btn" href={`/sales/${sale.id}/receipt`}>
            Receipt
          </Link>
          <Link className="btn btn-outline" href={`/returns/new?saleId=${sale.id}`}>
            Create Return
          </Link>
        </div>
      </section>
    </section>
  );
}
