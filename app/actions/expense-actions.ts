import { ExpenseType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PosError } from "@/lib/pos/errors";

type CreateExpenseInput = {
  amount: number;
  type: string;
  note?: string;
};

function normalizeExpenseType(type: string) {
  const normalized = type.trim().toUpperCase();
  if (normalized === ExpenseType.GENERAL) {
    return ExpenseType.GENERAL;
  }
  if (normalized === ExpenseType.SPECIFIC) {
    return ExpenseType.SPECIFIC;
  }
  throw new PosError("INVALID_INPUT", "Expense type must be GENERAL or SPECIFIC.");
}

export async function createExpense(input: CreateExpenseInput) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new PosError("INVALID_INPUT", "Expense amount must be greater than zero.");
  }

  const normalizedType = normalizeExpenseType(input.type);
  const note = input.note?.trim();
  if (normalizedType === ExpenseType.SPECIFIC && !note) {
    throw new PosError("INVALID_INPUT", "Specific expense requires a note.");
  }

  return prisma.expense.create({
    data: {
      amount: input.amount,
      type: normalizedType,
      note: note || null,
    },
    select: {
      id: true,
      amount: true,
      type: true,
      note: true,
      createdAt: true,
    },
  });
}

export async function listDailyExpenses(referenceDate = new Date()) {
  const dayStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  return prisma.expense.findMany({
    where: {
      createdAt: {
        gte: dayStart,
        lt: nextDayStart,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      type: true,
      note: true,
      createdAt: true,
    },
  });
}
