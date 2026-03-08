import { getSaleById } from "@/app/actions/sale-actions";
import { apiErrorResponse } from "@/lib/pos/http";
import { PosError } from "@/lib/pos/errors";
import { toInt } from "@/lib/pos/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sale = await getSaleById(toInt(id));
    if (!sale) {
      throw new PosError("NOT_FOUND", "Sale not found.");
    }
    return Response.json({ data: sale });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

