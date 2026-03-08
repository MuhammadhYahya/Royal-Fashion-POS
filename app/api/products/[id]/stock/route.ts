import { adjustStock } from "@/app/actions/product-actions";
import { apiErrorResponse } from "@/lib/pos/http";
import { toInt } from "@/lib/pos/format";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await adjustStock(toInt(id), toInt(body.delta));
    return Response.json({ data: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

