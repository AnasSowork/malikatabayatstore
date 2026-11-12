"use client";

import { useTranslations } from "next-intl";
import type { AppLocale } from "@/lib/product-i18n";
import { formatMad } from "@/lib/format-price";
import type { BundleOffer } from "@/lib/bundle-offers";

type Props = {
  offer: BundleOffer;
  locale: AppLocale;
};

export function BundleQuantitySelector({ offer, locale }: Props) {
  const t = useTranslations("product");

  return (
    <div className="flex items-center justify-between border border-brand-black/15 bg-surface-bright px-4 py-3.5">
      <span className="text-sm text-on-surface-variant">{t("bundleQuantity")}</span>
      <span className="text-sm text-on-surface">
        {t("bundleTier", { count: offer.quantity, price: formatMad(offer.price, locale) })}
      </span>
    </div>
  );
}
