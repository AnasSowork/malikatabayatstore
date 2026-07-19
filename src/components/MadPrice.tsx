import type { AppLocale } from "@/lib/product-i18n";
import { formatMadParts } from "@/lib/format-price";

type Props = {
  amount: number | string;
  locale: AppLocale;
  className?: string;
  amountClassName?: string;
  currencyClassName?: string;
};

export function MadPrice({
  amount,
  locale,
  className = "",
  amountClassName = "price-amount",
  currencyClassName = "price-currency",
}: Props) {
  const parts = formatMadParts(amount, locale);
  const amountEl = <span className={amountClassName}>{parts.amount}</span>;
  const currencyEl = <span className={currencyClassName}>{parts.currency}</span>;

  // Arabic: درهم then number (درهم 280). French: number then MAD.
  if (locale === "ar") {
    return (
      <span className={`mad-price ${className}`.trim()} dir="ltr">
        {currencyEl}
        {amountEl}
      </span>
    );
  }

  return (
    <span className={`mad-price ${className}`.trim()} dir="ltr">
      {amountEl}
      {currencyEl}
    </span>
  );
}
