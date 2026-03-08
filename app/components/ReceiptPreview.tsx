import { formatMoney } from "@/lib/pos/format";

type ReceiptLine = {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ReceiptPayment = {
  id: number;
  method: string;
  amount: number;
};

type ReceiptPreviewProps = {
  shopName: string;
  title: string;
  receiptNumber: number | string;
  createdAt: Date | string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  payments: ReceiptPayment[];
};

export function ReceiptPreview({
  shopName,
  title,
  receiptNumber,
  createdAt,
  lines,
  subtotal,
  discount,
  total,
  payments,
}: ReceiptPreviewProps) {
  const printableDate =
    createdAt instanceof Date
      ? createdAt.toLocaleString("en-LK")
      : new Date(createdAt).toLocaleString("en-LK");

  return (
    <article className="receipt">
      <h1>{shopName}</h1>
      <p>
        {title} #{receiptNumber}
      </p>
      <p>{printableDate}</p>
      <hr />
      <table className="table receipt-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td>{line.productName}</td>
              <td>{line.quantity}</td>
              <td>{formatMoney(line.unitPrice, "LKR", "en-LK")}</td>
              <td>{formatMoney(line.lineTotal, "LKR", "en-LK")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <p>Subtotal: {formatMoney(subtotal, "LKR", "en-LK")}</p>
      <p>Discount: {formatMoney(discount, "LKR", "en-LK")}</p>
      <p>Total: {formatMoney(total, "LKR", "en-LK")}</p>
      <h3>Payments</h3>
      <ul>
        {payments.map((payment) => (
          <li key={payment.id}>
            {payment.method}: {formatMoney(payment.amount, "LKR", "en-LK")}
          </li>
        ))}
      </ul>
    </article>
  );
}
