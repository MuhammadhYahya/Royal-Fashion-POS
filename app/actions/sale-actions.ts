import { prisma } from "@/lib/prisma";
import { computeSaleLine, computeSaleTotals } from "@/lib/pos/calc";
import { PosError } from "@/lib/pos/errors";
import type { CreateSaleInput } from "@/lib/pos/types";

const VALID_PAYMENT_METHODS = new Set(["CASH", "CARD", "TRANSFER", "EWALLET"]);

function getRefundedTotal(returns: Array<{ totalRefund: number }>) {
  return returns.reduce((sum, rtn) => sum + rtn.totalRefund, 0);
}

function getReturnedCost(
  returns: Array<{ lines: Array<{ quantity: number; saleLine: { unitCost: number } }> }>,
) {
  return returns.reduce(
    (sum, rtn) =>
      sum +
      rtn.lines.reduce((lineSum, line) => lineSum + line.quantity * line.saleLine.unitCost, 0),
    0,
  );
}

function validatePayments(total: number, payments: { amount: number; method: unknown }[]) {
  if (payments.length === 0) {
    throw new PosError("INVALID_PAYMENT_SUM", "At least one payment is required.");
  }
  for (const payment of payments) {
    if (!VALID_PAYMENT_METHODS.has(String(payment.method))) {
      throw new PosError("INVALID_INPUT", "Unsupported payment method.");
    }
    if (!Number.isInteger(payment.amount) || payment.amount < 0) {
      throw new PosError("INVALID_INPUT", "Payment amount must be a non-negative integer.");
    }
  }
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid !== total) {
    throw new PosError("INVALID_PAYMENT_SUM", "Payment sum must equal sale total.");
  }
}

export async function createSale(input: CreateSaleInput) {
  if (input.lines.length === 0) {
    throw new PosError("EMPTY_CART", "Cart is empty.");
  }

  const uniqueProductIds = [...new Set(input.lines.map((line) => line.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const prepared = input.lines.map((line) => {
    if (line.quantity <= 0) {
      throw new PosError("INVALID_INPUT", "Quantity must be greater than zero.");
    }

    const product = productMap.get(line.productId);
    if (!product) {
      throw new PosError("NOT_FOUND", "Product not found.");
    }
    if (product.stock < line.quantity) {
      throw new PosError(
        "INSUFFICIENT_STOCK",
        `Insufficient stock for ${product.name}.`,
      );
    }

    return {
      product,
      quantity: line.quantity,
      ...computeSaleLine(line.quantity, product.price, product.cost),
    };
  });

  const totals = computeSaleTotals(
    prepared.map((l) => l.lineTotal),
    prepared.map((l) => l.lineProfit),
    input.discount,
  );
  validatePayments(totals.total, input.payments);

  return prisma.$transaction(async (tx) => {
    for (const line of prepared) {
      const updated = await tx.product.updateMany({
        where: {
          id: line.product.id,
          stock: { gte: line.quantity },
        },
        data: {
          stock: { decrement: line.quantity },
        },
      });
      if (updated.count !== 1) {
        throw new PosError(
          "INSUFFICIENT_STOCK",
          `Stock changed while selling ${line.product.name}.`,
        );
      }
    }

    return tx.sale.create({
      data: {
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        profit: totals.profit,
        saleLines: {
          create: prepared.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: line.unitCost,
            lineTotal: line.lineTotal,
            lineProfit: line.lineProfit,
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
        saleLines: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });
  });
}

export async function listSales() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      payments: true,
      returns: {
        select: {
          totalRefund: true,
        },
      },
      _count: { select: { saleLines: true, returns: true } },
    },
  });

  return sales.map((sale) => {
    const refundedTotal = getRefundedTotal(sale.returns);
    return {
      ...sale,
      refundedTotal,
      netTotal: sale.total - refundedTotal,
    };
  });
}

async function aggregateSales(from: Date, to: Date) {
  const result = await prisma.sale.aggregate({
    where: {
      createdAt: {
        gte: from,
        lt: to,
      },
    },
    _sum: {
      total: true,
      profit: true,
    },
    _count: {
      _all: true,
    },
  });

  return {
    totalSales: result._sum.total ?? 0,
    totalProfit: result._sum.profit ?? 0,
    transactions: result._count._all,
  };
}

async function aggregateReturns(from: Date, to: Date) {
  const returns = await prisma.return.findMany({
    where: {
      createdAt: {
        gte: from,
        lt: to,
      },
    },
    select: {
      totalRefund: true,
      lines: {
        select: {
          quantity: true,
          saleLine: {
            select: {
              unitCost: true,
            },
          },
        },
      },
    },
  });

  return {
    totalRefunds: getRefundedTotal(returns),
    returnedCost: getReturnedCost(returns),
    returns: returns.length,
  };
}

async function aggregateExpenses(from: Date, to: Date) {
  const result = await prisma.expense.aggregate({
    where: {
      createdAt: {
        gte: from,
        lt: to,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return result._sum.amount ?? 0;
}

async function aggregateSalesWithExpenses(from: Date, to: Date) {
  const [sales, returns, totalExpenses] = await Promise.all([
    aggregateSales(from, to),
    aggregateReturns(from, to),
    aggregateExpenses(from, to),
  ]);
  return {
    ...sales,
    totalRefunds: returns.totalRefunds,
    netSales: sales.totalSales - returns.totalRefunds,
    totalExpenses,
    netProfit: sales.totalProfit - returns.totalRefunds + returns.returnedCost - totalExpenses,
    refunds: returns.returns,
  };
}

export async function getSalesReports() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);

  const [daily, monthly, annual] = await Promise.all([
    aggregateSalesWithExpenses(dayStart, nextDayStart),
    aggregateSalesWithExpenses(monthStart, nextMonthStart),
    aggregateSalesWithExpenses(yearStart, nextYearStart),
  ]);

  return { daily, monthly, annual };
}

export async function getSaleById(id: number) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      saleLines: {
        include: { product: true },
      },
      payments: true,
      returns: {
        orderBy: { createdAt: "desc" },
        include: {
          lines: {
            select: {
              quantity: true,
              saleLine: {
                select: {
                  unitCost: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!sale) {
    return null;
  }

  const refundedTotal = getRefundedTotal(sale.returns);
  const returnedCost = getReturnedCost(sale.returns);

  return {
    ...sale,
    refundedTotal,
    netTotal: sale.total - refundedTotal,
    netProfit: sale.profit - refundedTotal + returnedCost,
  };
}
