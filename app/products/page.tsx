import { listProducts } from "@/app/actions/product-actions";
import { listCategories } from "@/app/actions/category-actions";
import { ProductManager } from "@/app/components/product-manager";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);

  return (
    <section className="stack">
      <h1>Products</h1>
      <ProductManager initialProducts={products} initialCategories={categories} />
    </section>
  );
}
