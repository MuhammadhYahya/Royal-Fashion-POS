import { listProducts } from "@/app/actions/product-actions";
import { InventoryManager } from "@/app/components/inventory-manager";

export default async function InventoryPage() {
  const products = await listProducts();

  return <InventoryManager initialProducts={products} />;
}
