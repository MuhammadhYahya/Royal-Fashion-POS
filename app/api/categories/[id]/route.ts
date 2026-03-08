import { deleteCategory, updateCategory } from "@/app/actions/category-actions";
import { apiErrorResponse } from "@/lib/pos/http";
import { toInt } from "@/lib/pos/format";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateCategory(toInt(id), {
      name: String(body.name ?? ""),
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
    const deleted = await deleteCategory(toInt(id));
    return Response.json({ data: deleted });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
