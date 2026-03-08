import { prisma } from "@/lib/prisma";
import { computeSaleLine, computeSaleTotals } from "@/lib/pos/calc";
import { PosError } from "@/lib/pos/errors";
import type { CreateSaleInput } from "@/lib/pos/types";

const VALID_PAYMENT_METHODS = new Set(["CASH", "CARD", "TRANSFER", "EWALLET"]);

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
  return prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      payments: true,
      _count: { select: { saleLines: true, returns: true } },
    },
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
  const [sales, totalExpenses] = await Promise.all([aggregateSales(from, to), aggregateExpenses(from, to)]);
  return {
    ...sales,
    totalExpenses,
    netProfit: sales.totalProfit - totalExpenses,
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
  return prisma.sale.findUnique({
    where: { id },
    include: {
      saleLines: {
        include: { product: true },
      },
      payments: true,
      returns: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
