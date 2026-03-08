export type PosErrorCode =
  | "INSUFFICIENT_STOCK"
  | "INVALID_PAYMENT_SUM"
  | "INVALID_REFUND_SUM"
  | "RETURN_QTY_EXCEEDS_SOLD_QTY"
  | "INVALID_DISCOUNT"
  | "INVALID_ADJUSTMENT"
  | "EMPTY_CART"
  | "EMPTY_RETURN"
  | "INVALID_INPUT"
  | "NOT_FOUND";

export class PosError extends Error {
  code: PosErrorCode;

  constructor(code: PosErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

