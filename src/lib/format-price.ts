import type { AppLocale } from "./product-i18n";

export type MadPriceParts = {
  amount: string;
  currency: string;
};

export function formatMadParts(amount: number | string, locale: AppLocale): MadPriceParts {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const amountText = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

  if (locale === "ar") {
    return { amount: amountText, currency: "درهم" };
  }

  return { amount: amountText, currency: "MAD" };
}

export function formatMad(amount: number | string, locale: AppLocale): string {
  const { amount: value, currency } = formatMadParts(amount, locale);
  if (locale === "ar") {
    return `${value} ${currency}`;
  }
  return `${value}\u00a0${currency}`;
}
