import type { AppLocale } from "./product-i18n";

export function formatMad(amount: number | string, locale: AppLocale): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

  if (locale !== "ar") return formatted;

  // Intl uses the abbreviated "د.م." symbol; show the full word instead.
  return formatted.replace(/\u200f?د\.م\.\u200f?/g, "درهم").replace(/\s+/g, " ").trim();
}
