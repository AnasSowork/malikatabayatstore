import type { AppLocale } from "./product-i18n";

export function formatMad(amount: number | string, locale: AppLocale): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
