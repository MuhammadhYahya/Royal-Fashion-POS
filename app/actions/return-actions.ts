import { prisma } from "@/lib/prisma";
import { computeReturnTotals } from "@/lib/pos/calc";
import { PosError } from "@/lib/pos/errors";
import type { CreateReturnInput } from "@/lib/pos/types";

const VALID_PAYMENT_METHODS = new Set(["CASH", "CARD", "TRANSFER", "EWALLET"]);

function validateRefundPayments(totalRefund: number, payments: { amount: number; method: unknown }[]) {
  if (payments.length === 0) {
    throw new PosError("INVALID_REFUND_SUM", "At least one refund payment is required.");
  }
  for (const payment of payments) {
    if (!VALID_PAYMENT_METHODS.has(String(payment.method))) {
      throw new PosError("INVALID_INPUT", "Unsupported refund method.");
    }
    if (!Number.isInteger(payment.amount) || payment.amount <= 0) {
      throw new PosError("INVALID_INPUT", "Refund amount must be greater than zero.");
    }
    if (payment.amount > totalRefund) {
      throw new PosError("INVALID_REFUND_SUM", "Refund amount cannot exceed total refundable amount.");
    }
  }
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid !== totalRefund) {
    throw new PosError("INVALID_REFUND_SUM", "Refund payout sum must equal total refund.");
  }
}

export async function getReturnableSaleLines(saleId: number) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      saleLines: {
        include: {
          product: true,
          returnLines: true,
        },
      },
    },
  });

  if (!sale) {
    throw new PosError("NOT_FOUND", "Sale not found.");
  }

  return sale.saleLines.map((line) => {
    const alreadyReturned = line.returnLines.reduce((sum, r) => sum + r.quantity, 0);
    const remainingQty = line.quantity - alreadyReturned;
    return {
      saleLineId: line.id,
      productId: line.productId,
      productName: line.product.name,
      soldQty: line.quantity,
      alreadyReturned,
      remainingQty,
      unitPrice: line.unitPrice,
    };
  });
}

export async function createReturn(input: CreateReturnInput) {
  if (input.lines.length === 0) {
    throw new PosError("EMPTY_RETURN", "No return lines selected.");
  }

  const sale = await prisma.sale.findUnique({
    where: { id: input.saleId },
    include: {
      saleLines: {
        include: {
          returnLines: true,
          product: true,
        },
      },
    },
  });

  if (!sale) {
    throw new PosError("NOT_FOUND", "Sale not found.");
  }

  const saleLineMap = new Map(sale.saleLines.map((line) => [line.id, line]));
  const preparedLines = input.lines.map((line) => {
    if (line.quantity <= 0) {
      throw new PosError("INVALID_INPUT", "Return quantity must be positive.");
    }
    const saleLine = saleLineMap.get(line.saleLineId);
    if (!saleLine) {
      throw new PosError("INVALID_INPUT", "Return line must belong to the sale.");
    }
    const alreadyReturned = saleLine.returnLines.reduce((sum, r) => sum + r.quantity, 0);
    if (alreadyReturned + line.quantity > saleLine.quantity) {
      throw new PosError(
        "RETURN_QTY_EXCEEDS_SOLD_QTY",
        `Return exceeds sold qty for ${saleLine.product.name}.`,
      );
    }

    return {
      saleLineId: saleLine.id,
      productId: saleLine.productId,
      quantity: line.quantity,
      unitPrice: saleLine.unitPrice,
      lineTotal: saleLine.unitPrice * line.quantity,
    };
  });

  const totals = computeReturnTotals(
    preparedLines.map((line) => line.lineTotal),
    input.adjustment,
  );
  validateRefundPayments(totals.totalRefund, input.payments);

  return prisma.$transaction(async (tx) => {
    const created = await tx.return.create({
      data: {
        saleId: input.saleId,
        subtotal: totals.subtotal,
        adjustment: totals.adjustment,
        totalRefund: totals.totalRefund,
        note: input.note?.trim() || null,
        lines: {
          create: preparedLines.map((line) => ({
            saleLineId: line.saleLineId,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
        payments: {
          create: input.payments.map((p) => ({
            amount: p.amount,
            method: p.method,
          })),
        },
      },
      include: {
        lines: {
          include: {
            product: true,
            saleLine: true,
          },
        },
        payments: true,
      },
    });

    for (const line of preparedLines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { increment: line.quantity } },
      });
    }

    return created;
  });
}

export async function listReturns() {
  return prisma.return.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sale: true,
      payments: true,
      _count: { select: { lines: true } },
    },
  });
}

export async function getReturnById(id: number) {
  return prisma.return.findUnique({
    where: { id },
    include: {
      sale: true,
      lines: {
        include: {
          product: true,
          saleLine: true,
        },
      },
      payments: true,
    },
  });
}
