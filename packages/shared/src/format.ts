const fallbackCurrency = "VND";

export function formatCurrency(
  value: number | string | null | undefined,
  currency = fallbackCurrency
) {
  const numericValue = Number(value ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const safeCurrency =
    typeof currency === "string" && currency.length === 3
      ? currency.toUpperCase()
      : fallbackCurrency;

  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(safeValue);
  } catch {
    return `${safeValue.toLocaleString("vi-VN")} ${fallbackCurrency}`;
  }
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}
