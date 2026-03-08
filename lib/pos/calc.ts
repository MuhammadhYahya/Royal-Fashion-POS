import { PosError } from "./errors";
import type { Money } from "./types";

export type ComputedSaleLine = {
  unitPrice: Money;
  unitCost: Money;
  lineTotal: Money;
  lineProfit: Money;
};

export function computeSaleLine(
  quantity: number,
  unitPrice: Money,
  unitCost: Money,
): ComputedSaleLine {
  const lineTotal = unitPrice * quantity;
  const lineProfit = (unitPrice - unitCost) * quantity;

  return {
    unitPrice,
    unitCost,
    lineTotal,
    lineProfit,
  };
}

export function computeSaleTotals(
  lineTotals: Money[],
  lineProfits: Money[],
  discount: Money,
) {
  const subtotal = lineTotals.reduce((sum, n) => sum + n, 0);
  if (discount < 0 || discount > subtotal) {
    throw new PosError("INVALID_DISCOUNT", "Discount must be 0..subtotal.");
  }

  const total = subtotal - discount;
  const profit = lineProfits.reduce((sum, n) => sum + n, 0) - discount;

  return { subtotal, discount, total, profit };
}

export function computeReturnTotals(lineTotals: Money[], adjustment: Money) {
  const subtotal = lineTotals.reduce((sum, n) => sum + n, 0);
  if (adjustment < 0 || adjustment > subtotal) {
    throw new PosError(
      "INVALID_ADJUSTMENT",
      "Adjustment must be 0..return subtotal.",
    );
  }

  const totalRefund = subtotal - adjustment;
  return { subtotal, adjustment, totalRefund };
}
