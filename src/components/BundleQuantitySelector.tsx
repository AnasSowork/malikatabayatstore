"use client";

import { useTranslations } from "next-intl";
import type { AppLocale } from "@/lib/product-i18n";
import { formatMad } from "@/lib/format-price";
import { bundleSavings, type BundleOffer } from "@/lib/bundle-offers";
import { MaterialIcon } from "@/components/MaterialIcon";

type Props = {
  offers: BundleOffer[];
  unitPrice: number;
  selectedQuantity: number;
  onSelect: (quantity: number) => void;
  locale: AppLocale;
};

export function BundleQuantitySelector({
  offers,
  unitPrice,
  selectedQuantity,
  onSelect,
  locale,
}: Props) {
  const t = useTranslations("product");
  if (offers.length <= 1) return null;

  return (
    <div className="space-y-3">
      <span className="font-store text-xs font-semibold text-on-surface-variant">{t("bundleQuantity")}</span>
      <div className="flex flex-col gap-2">
        {offers.map((offer) => {
          const savings = bundleSavings(offer, unitPrice);
          const selected = selectedQuantity === offer.quantity;
          return (
            <button
              key={offer.quantity}
              type="button"
              onClick={() => onSelect(offer.quantity)}
              className={`bundle-option ${selected ? "bundle-option-selected" : ""}`}
              aria-pressed={selected}
            >
              <span className="bundle-option-main">
                <span className="bundle-option-radio" aria-hidden>
                  {selected ? <MaterialIcon name="check" className="!text-sm" /> : null}
                </span>
                <span className="font-store text-lg font-semibold text-on-surface">
                  {t("bundleTier", { count: offer.quantity, price: formatMad(offer.price, locale) })}
                </span>
              </span>
              {savings > 0 ? (
                <span className="bundle-option-saving">
                  {t("saveAmount", { amount: formatMad(savings, locale) })}
                </span>
              ) : (
                <span className="bundle-option-current">
                  {selected ? <MaterialIcon name="done_all" className="!text-lg" /> : null}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
