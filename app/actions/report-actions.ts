import { prisma } from "@/lib/prisma";

export type DailySummaryRow = {
  date: string;
  totalSales: number;
  totalExpenses: number;
  finalBalance: number;
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
  cashPayments: number;
  cardPayments: number;
  discounts: number;
  totalExpenses: number;
  expenses: DailyExpenseDetail[];
  expenseCategoryTotals: {
    Tea: number;
    Transport: number;
    Other: number;
  };
  finalBalance: number;
  transactionCount: number;
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

export async function getDailySummaryRows() {
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      select: {
        createdAt: true,
        total: true,
      },
    }),
    prisma.expense.findMany({
      select: {
        createdAt: true,
        amount: true,
      },
    }),
  ]);

  const totalsByDay = new Map<string, { totalSales: number; totalExpenses: number }>();

  for (const sale of sales) {
    const dateKey = toLocalDateKey(new Date(sale.createdAt));
    const existing = totalsByDay.get(dateKey) ?? { totalSales: 0, totalExpenses: 0 };
    existing.totalSales += sale.total;
    totalsByDay.set(dateKey, existing);
  }

  for (const expense of expenses) {
    const dateKey = toLocalDateKey(new Date(expense.createdAt));
    const existing = totalsByDay.get(dateKey) ?? { totalSales: 0, totalExpenses: 0 };
    existing.totalExpenses += expense.amount;
    totalsByDay.set(dateKey, existing);
  }

  return [...totalsByDay.entries()]
    .map(([date, totals]) => ({
      date,
      totalSales: totals.totalSales,
      totalExpenses: totals.totalExpenses,
      finalBalance: totals.totalSales - totals.totalExpenses,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDailyCompleteReport(dateKey: string): Promise<DailyCompleteReport | null> {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return null;
  }

  const { start, end } = parsed;
  const [sales, expenses] = await Promise.all([
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
        payments: {
          select: {
            amount: true,
            method: true,
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
  let cashPayments = 0;
  let cardPayments = 0;
  let discounts = 0;

  for (const sale of sales) {
    totalSales += sale.total;
    discounts += sale.discount;
    for (const payment of sale.payments) {
      if (payment.method === "CASH") {
        cashPayments += payment.amount;
      }
      if (payment.method === "CARD") {
        cardPayments += payment.amount;
      }
    }
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
    cashPayments,
    cardPayments,
    discounts,
    totalExpenses,
    expenses: detailedExpenses,
    expenseCategoryTotals,
    finalBalance: totalSales - totalExpenses,
    transactionCount: sales.length,
  };
}
