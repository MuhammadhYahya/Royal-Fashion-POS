import { prisma } from "@/lib/prisma";

export type DailySummaryRow = {
  date: string;
  totalSales: number;
  totalRefunds: number;
  netSales: number;
  totalExpenses: number;
  netProfit: number;
};

export type DailyExpenseDetail = {
  id: number;
  createdAt: string;
  amount: number;
  type: "GENERAL" | "SPECIFIC";
  category: "Tea" | "Transport" | "Other";
  note: string | null;
};

export type DailyCompleteReport = {
  date: string;
  generatedAt: string;
  totalSales: number;
  totalRefunds: number;
  netSales: number;
  cashPayments: number;
  cardPayments: number;
  transferPayments: number;
  ewalletPayments: number;
  discounts: number;
  totalExpenses: number;
  expenses: DailyExpenseDetail[];
  expenseCategoryTotals: {
    Tea: number;
    Transport: number;
    Other: number;
  };
  netProfit: number;
  transactionCount: number;
  returnCount: number;
};

function toLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = dateKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const start = new Date(year, month - 1, day);
  if (
    start.getFullYear() !== year ||
    start.getMonth() !== month - 1 ||
    start.getDate() !== day
  ) {
    return null;
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function classifyExpenseCategory(note: string | null) {
  if (!note) {
    return "Other" as const;
  }
  const normalized = note.toLowerCase();
  if (normalized.includes("tea")) {
    return "Tea" as const;
  }
  if (
    normalized.includes("transport") ||
    normalized.includes("travel") ||
    normalized.includes("fuel")
  ) {
    return "Transport" as const;
  }
  return "Other" as const;
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

export async function getDailySummaryRows() {
  const [sales, returns, expenses] = await Promise.all([
    prisma.sale.findMany({
      select: {
        createdAt: true,
        total: true,
        profit: true,
      },
    }),
    prisma.return.findMany({
      select: {
        createdAt: true,
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
    }),
    prisma.expense.findMany({
      select: {
        createdAt: true,
        amount: true,
      },
    }),
  ]);

  const totalsByDay = new Map<
    string,
    {
      totalSales: number;
      totalProfit: number;
      totalRefunds: number;
      returnedCost: number;
      totalExpenses: number;
    }
  >();

  for (const sale of sales) {
    const dateKey = toLocalDateKey(new Date(sale.createdAt));
    const existing = totalsByDay.get(dateKey) ?? {
      totalSales: 0,
      totalProfit: 0,
      totalRefunds: 0,
      returnedCost: 0,
      totalExpenses: 0,
    };
    existing.totalSales += sale.total;
    existing.totalProfit += sale.profit;
    totalsByDay.set(dateKey, existing);
  }

  for (const rtn of returns) {
    const dateKey = toLocalDateKey(new Date(rtn.createdAt));
    const existing = totalsByDay.get(dateKey) ?? {
      totalSales: 0,
      totalProfit: 0,
      totalRefunds: 0,
      returnedCost: 0,
      totalExpenses: 0,
    };
    existing.totalRefunds += rtn.totalRefund;
    existing.returnedCost += getReturnedCost([rtn]);
    totalsByDay.set(dateKey, existing);
  }

  for (const expense of expenses) {
    const dateKey = toLocalDateKey(new Date(expense.createdAt));
    const existing = totalsByDay.get(dateKey) ?? {
      totalSales: 0,
      totalProfit: 0,
      totalRefunds: 0,
      returnedCost: 0,
      totalExpenses: 0,
    };
    existing.totalExpenses += expense.amount;
    totalsByDay.set(dateKey, existing);
  }

  return [...totalsByDay.entries()]
    .map(([date, totals]) => ({
      date,
      totalSales: totals.totalSales,
      totalRefunds: totals.totalRefunds,
      netSales: totals.totalSales - totals.totalRefunds,
      totalExpenses: totals.totalExpenses,
      netProfit:
        totals.totalProfit - totals.totalRefunds + totals.returnedCost - totals.totalExpenses,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDailyCompleteReport(dateKey: string): Promise<DailyCompleteReport | null> {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return null;
  }

  const { start, end } = parsed;
  const [sales, returns, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        total: true,
        discount: true,
        profit: true,
        payments: {
          select: {
            amount: true,
            method: true,
          },
        },
      },
    }),
    prisma.return.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
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
    }),
    prisma.expense.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        createdAt: true,
        amount: true,
        type: true,
        note: true,
      },
    }),
  ]);

  let totalSales = 0;
  let totalProfit = 0;
  let totalRefunds = 0;
  let cashPayments = 0;
  let cardPayments = 0;
  let transferPayments = 0;
  let ewalletPayments = 0;
  let discounts = 0;

  for (const sale of sales) {
    totalSales += sale.total;
    totalProfit += sale.profit;
    discounts += sale.discount;
    for (const payment of sale.payments) {
      if (payment.method === "CASH") {
        cashPayments += payment.amount;
      }
      if (payment.method === "CARD") {
        cardPayments += payment.amount;
      }
      if (payment.method === "TRANSFER") {
        transferPayments += payment.amount;
      }
      if (payment.method === "EWALLET") {
        ewalletPayments += payment.amount;
      }
    }
  }

  let returnedCost = 0;
  for (const rtn of returns) {
    totalRefunds += rtn.totalRefund;
    returnedCost += getReturnedCost([rtn]);
  }

  const detailedExpenses: DailyExpenseDetail[] = expenses.map((expense) => ({
    id: expense.id,
    createdAt: expense.createdAt.toISOString(),
    amount: expense.amount,
    type: expense.type,
    category: classifyExpenseCategory(expense.note),
    note: expense.note,
  }));

  const expenseCategoryTotals = {
    Tea: 0,
    Transport: 0,
    Other: 0,
  };
  let totalExpenses = 0;

  for (const expense of detailedExpenses) {
    totalExpenses += expense.amount;
    expenseCategoryTotals[expense.category] += expense.amount;
  }

  return {
    date: dateKey,
    generatedAt: new Date().toISOString(),
    totalSales,
    totalRefunds,
    netSales: totalSales - totalRefunds,
    cashPayments,
    cardPayments,
    transferPayments,
    ewalletPayments,
    discounts,
    totalExpenses,
    expenses: detailedExpenses,
    expenseCategoryTotals,
    netProfit: totalProfit - totalRefunds + returnedCost - totalExpenses,
    transactionCount: sales.length,
    returnCount: returns.length,
  };
}
