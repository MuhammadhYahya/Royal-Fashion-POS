import { getReturnById } from "@/app/actions/return-actions";
import { PosError } from "@/lib/pos/errors";
import { toInt } from "@/lib/pos/format";
import { apiErrorResponse } from "@/lib/pos/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = await getReturnById(toInt(id));
    if (!data) {
      throw new PosError("NOT_FOUND", "Return not found.");
    }
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

