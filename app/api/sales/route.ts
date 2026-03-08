import { createSale, listSales } from "@/app/actions/sale-actions";
import { apiErrorResponse } from "@/lib/pos/http";
import { toInt } from "@/lib/pos/format";

export async function GET() {
  try {
    const sales = await listSales();
    return Response.json({ data: sales });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await createSale({
      lines: Array.isArray(body.lines)
        ? body.lines.map((line: { productId: number; quantity: number }) => ({
            productId: toInt(line.productId),
            quantity: toInt(line.quantity),
          }))
        : [],
      discount: toInt(body.discount),
      payments: Array.isArray(body.payments)
        ? body.payments.map((payment: { amount: number; method: string }) => ({
            amount: toInt(payment.amount),
            method: payment.method,
          }))
        : [],
    });
    return Response.json({ data: created });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

