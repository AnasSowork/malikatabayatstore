"use client";

import { useTranslations } from "next-intl";
import type { AppLocale } from "@/lib/product-i18n";
import { formatMad } from "@/lib/format-price";
import { bundleSavings, type BundleOffer } from "@/lib/bundle-offers";

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
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-start transition-all ${
                selected
                  ? "border-primary bg-surface-container-high"
                  : "border-outline-variant/50 hover:border-primary/50"
              }`}
              aria-pressed={selected}
            >
              <span className="font-store text-lg font-semibold text-on-surface">
                {t("bundleTier", { count: offer.quantity, price: formatMad(offer.price, locale) })}
              </span>
              {savings > 0 ? (
                <span className="font-store text-[11px] font-semibold brand-gold-text">
                  {t("saveAmount", { amount: formatMad(savings, locale) })}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
