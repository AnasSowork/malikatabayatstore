"use client";

import { useEffect, useState } from "react";
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
  const [remainingSeconds, setRemainingSeconds] = useState(30 * 60);

  useEffect(() => {
    const storageKey = "malikat-offer-countdown";
    const storedEnd = Number(window.sessionStorage.getItem(storageKey));
    const endAt = storedEnd > Date.now() ? storedEnd : Date.now() + 30 * 60 * 1000;
    window.sessionStorage.setItem(storageKey, String(endAt));

    const update = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (offers.length <= 1) return null;
  const featuredQuantity = offers.find((offer) => offer.quantity === 2)?.quantity ?? offers[1]?.quantity;
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div className="space-y-3">
      <div className="offer-countdown" role="timer" aria-live="off">
        <span>{t("offerCountdown")}</span>
        <strong dir="ltr">00 : {minutes} : {seconds}</strong>
      </div>
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
              {offer.quantity === featuredQuantity ? (
                <span className="bundle-option-featured">{t("mostRequested")}</span>
              ) : null}
              <span className="bundle-option-main">
                <span className="bundle-option-radio" aria-hidden>
                  {selected ? <MaterialIcon name="check" className="!text-sm" /> : null}
                </span>
                <span className="bundle-option-title">
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
