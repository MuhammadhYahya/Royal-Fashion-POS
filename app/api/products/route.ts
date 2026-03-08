import { createProduct, listProducts } from "@/app/actions/product-actions";
import { apiErrorResponse } from "@/lib/pos/http";
import { toInt } from "@/lib/pos/format";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? undefined;
    const products = await listProducts(query);
    return Response.json({ data: products });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await createProduct({
      sku: String(body.sku ?? ""),
      name: String(body.name ?? ""),
      categoryId: toInt(body.categoryId),
      price: toInt(body.price),
      cost: toInt(body.cost),
      stock: toInt(body.stock),
    });
    return Response.json({ data: created });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
