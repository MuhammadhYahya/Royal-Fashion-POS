import { getReturnById } from "@/app/actions/return-actions";
import { PrintButton } from "@/app/components/print-button";
import { formatMoney } from "@/lib/pos/format";

export default async function ReturnReceiptPage({
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
    <article className="receipt">
      <div className="no-print row">
        <PrintButton />
      </div>
      <h1>Bag Shop</h1>
      <p>Refund Receipt #{rtn.id}</p>
      <p>Original Sale #{rtn.saleId}</p>
      <p>{new Date(rtn.createdAt).toLocaleString("en-LK")}</p>
      <hr />
      <table className="table receipt-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Total</th>
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
      <hr />
      <p>Subtotal: {formatMoney(rtn.subtotal, "LKR", "en-LK")}</p>
      <p>Adjustment: {formatMoney(rtn.adjustment, "LKR", "en-LK")}</p>
      <p>Total Refund: {formatMoney(rtn.totalRefund, "LKR", "en-LK")}</p>
      <h3>Refund Methods</h3>
      <ul>
        {rtn.payments.map((payment) => (
          <li key={payment.id}>
            {payment.method}: {formatMoney(payment.amount, "LKR", "en-LK")}
          </li>
        ))}
      </ul>
    </article>
  );
}

