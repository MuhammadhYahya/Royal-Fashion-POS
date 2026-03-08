import type { PaymentMethod } from "@prisma/client";

export type Money = number;

export type CartLineInput = {
  productId: number;
  quantity: number;
};

export type PaymentInput = {
  method: PaymentMethod;
  amount: Money;
};

export type CreateSaleInput = {
  lines: CartLineInput[];
  discount: Money;
  payments: PaymentInput[];
};

export type ReturnLineInput = {
  saleLineId: number;
  quantity: number;
};

export type CreateReturnInput = {
  saleId: number;
  lines: ReturnLineInput[];
  adjustment: Money;
  note?: string;
  payments: PaymentInput[];
};

