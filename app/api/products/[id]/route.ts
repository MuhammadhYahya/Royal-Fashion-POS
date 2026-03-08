import { deleteProduct, updateProduct } from "@/app/actions/product-actions";
import { apiErrorResponse } from "@/lib/pos/http";
import { toInt } from "@/lib/pos/format";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateProduct(toInt(id), {
      sku: body.sku,
      name: body.name,
      categoryId: body.categoryId !== undefined ? toInt(body.categoryId) : undefined,
      price: body.price !== undefined ? toInt(body.price) : undefined,
      cost: body.cost !== undefined ? toInt(body.cost) : undefined,
      stock: body.stock !== undefined ? toInt(body.stock) : undefined,
    });
    return Response.json({ data: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await deleteProduct(toInt(id));
    return Response.json({ data: deleted });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
