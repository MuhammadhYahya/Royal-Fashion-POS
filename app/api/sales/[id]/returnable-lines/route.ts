import { getReturnableSaleLines } from "@/app/actions/return-actions";
import { apiErrorResponse } from "@/lib/pos/http";
import { toInt } from "@/lib/pos/format";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const lines = await getReturnableSaleLines(toInt(id));
    return Response.json({ data: lines });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

