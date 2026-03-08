import { createReturn, listReturns } from "@/app/actions/return-actions";
import { apiErrorResponse } from "@/lib/pos/http";
import { toInt } from "@/lib/pos/format";

export async function GET() {
  try {
    const returns = await listReturns();
    return Response.json({ data: returns });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await createReturn({
      saleId: toInt(body.saleId),
      lines: Array.isArray(body.lines)
        ? body.lines.map((line: { saleLineId: number; quantity: number }) => ({
            saleLineId: toInt(line.saleLineId),
            quantity: toInt(line.quantity),
          }))
        : [],
      adjustment: toInt(body.adjustment),
      note: body.note ? String(body.note) : undefined,
      payments: Array.isArray(body.payments)
        ? body.payments.map((payment: { method: string; amount: number }) => ({
            method: payment.method,
            amount: toInt(payment.amount),
          }))
        : [],
    });
    return Response.json({ data: created });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

