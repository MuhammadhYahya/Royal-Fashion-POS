import { createExpense, listDailyExpenses } from "@/app/actions/expense-actions";
import { toInt } from "@/lib/pos/format";
import { apiErrorResponse } from "@/lib/pos/http";

export async function GET() {
  try {
    const expenses = await listDailyExpenses();
    return Response.json({ data: expenses });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await createExpense({
      amount: toInt(body.amount),
      type: String(body.type ?? ""),
      note: body.note === undefined ? undefined : String(body.note),
    });
    return Response.json({ data: created });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
