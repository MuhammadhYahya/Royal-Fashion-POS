import { listProducts } from "@/app/actions/product-actions";
import { CashierPos } from "@/app/components/cashier-pos";

export default async function CashierPage() {
  const products = await listProducts();

  return (
    <section className="stack">
      <header className="section-head">
        <h1>Cashier POS</h1>
        <p>Scan products, take payment, and complete sales quickly.</p>
      </header>
      <CashierPos initialProducts={products} />
    </section>
  );
}
