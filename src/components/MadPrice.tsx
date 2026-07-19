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
  return (
    <span className={className} dir="ltr">
      <span className={amountClassName}>{parts.amount}</span>
      <span className={currencyClassName}>{parts.currency}</span>
    </span>
  );
}
