export function formatMoney(
  amount: number,
  currency = "LKR",
  locale = "en-LK",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function toInt(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

export function parseCurrencyToMinor(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}

export function formatMinorAsInput(amount: number) {
  return String(amount / 100);
}
