import { getSaleById } from "@/app/actions/sale-actions";
import { PrintButton } from "@/app/components/print-button";
import { ReceiptPreview } from "@/app/components/ReceiptPreview";

export default async function SaleReceiptPage({
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
      <div className="no-print row">
        <PrintButton />
      </div>
      <ReceiptPreview
        shopName="Bag Shop"
        title="Sale Receipt"
        receiptNumber={sale.id}
        createdAt={sale.createdAt}
        lines={sale.saleLines.map((line) => ({
          id: line.id,
          productName: line.product.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        }))}
        subtotal={sale.subtotal}
        discount={sale.discount}
        total={sale.total}
        payments={sale.payments.map((payment) => ({
          id: payment.id,
          method: payment.method,
          amount: payment.amount,
        }))}
      />
    </section>
  );
}
