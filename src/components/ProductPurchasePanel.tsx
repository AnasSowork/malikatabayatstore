"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SizeSelector } from "@/components/SizeSelector";
import { ColorVariantSelector } from "@/components/ColorVariantSelector";
import { useBasket } from "@/components/BasketProvider";
import { Link } from "@/i18n/navigation";
import type { ProductColorVariant } from "@/lib/product-serialize";
import type { AppLocale } from "@/lib/product-i18n";
import { bundleSavings, type BundleOffer } from "@/lib/bundle-offers";
import { lineMerchandise, maxBasketQuantity } from "@/lib/basket";
import { MadPrice } from "@/components/MadPrice";
import { formatMad } from "@/lib/format-price";
import { DEFAULT_PRODUCT_SIZE } from "@/lib/product-sizes";
import { trackAddToCart } from "@/lib/meta-pixel-events";
import type { ProductPurchaseUi } from "@/lib/product-detail-content";

type Props = {
  productId: string;
  productName: string;
  catalogName: string;
  nameFr: string | null;
  image: string;
  unitPrice: number;
  deliveryFee: number;
  colorVariants: ProductColorVariant[];
  bundleOffers: BundleOffer[];
  availableSizes: string[];
  stockQuantity: number | null;
  inStock: boolean;
  preferredColor?: string | null;
  purchaseUi?: ProductPurchaseUi;
  onColorChange?: (colorName: string) => void;
};

export function ProductPurchasePanel({
  productId,
  productName,
  catalogName,
  nameFr,
  image,
  unitPrice,
  deliveryFee,
  colorVariants,
  bundleOffers,
  availableSizes,
  stockQuantity,
  inStock,
  preferredColor,
  onColorChange,
}: Props) {
  const t = useTranslations("product");
  const basketT = useTranslations("basket");
  const locale = useLocale() as AppLocale;
  const basket = useBasket();
  const maxQuantity = maxBasketQuantity(stockQuantity);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState(availableSizes[0] ?? DEFAULT_PRODUCT_SIZE);
  const [color, setColor] = useState<string | null>(
    preferredColor ?? (colorVariants[0]?.name ?? null),
  );
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!preferredColor) return;
    setColor(preferredColor);
  }, [preferredColor]);

  const requiresColor = colorVariants.length > 0;
  const line = {
    unitPrice,
    bundleOffers,
    quantity: Math.min(maxQuantity, Math.max(1, quantity)),
  };
  const merchandise = maxQuantity > 0 ? lineMerchandise(line) : 0;
  const savings = bundleSavings(
    { quantity: line.quantity, price: merchandise },
    unitPrice,
  );
  const canAdd = inStock && maxQuantity > 0 && Boolean(size) && (!requiresColor || Boolean(color));

  function addToBasket() {
    if (!canAdd) return;
    basket.addItem({
      productId,
      name: catalogName,
      nameFr,
      image,
      unitPrice,
      bundleOffers,
      deliveryFee,
      quantity: line.quantity,
      size,
      color: requiresColor ? color : null,
      maxQuantity,
    });
    trackAddToCart({
      productId,
      productName,
      value: merchandise,
      quantity: line.quantity,
      unitPrice,
    });
    setAdded(true);
  }

  return (
    <div className="product-purchase-panel">
      <div className="basket-stepper-row">
        <span>{t("bundleQuantity")}</span>
        <div className="basket-stepper">
          <button
            type="button"
            aria-label={basketT("decrease")}
            disabled={!canAdd || line.quantity <= 1}
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          >
            −
          </button>
          <span>{line.quantity}</span>
          <button
            type="button"
            aria-label={basketT("increase")}
            disabled={!canAdd || line.quantity >= maxQuantity}
            onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
          >
            +
          </button>
        </div>
      </div>

      <ColorVariantSelector
        variants={colorVariants}
        selectedColor={color}
        onSelect={(next) => {
          setColor(next);
          onColorChange?.(next);
          setAdded(false);
        }}
      />
      <SizeSelector
        selectedSize={size}
        onSelect={(next) => {
          setSize(next);
          setAdded(false);
        }}
        sizes={availableSizes}
      />

      {inStock ? (
        <>
          <div className="order-cost-summary">
            <div className="order-cost-row order-cost-row-total">
              <span>{t("selectedTotal")}</span>
              <strong>
                <MadPrice amount={merchandise} locale={locale} />
              </strong>
            </div>
            {savings > 0 ? (
              <p className="basket-savings">{t("saveAmount", { amount: formatMad(savings, locale) })}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-brand btn-brand-block order-form-cta"
            disabled={!canAdd}
            onClick={addToBasket}
          >
            {basketT("add")}
          </button>
          {added ? (
            <p className="basket-added">
              {basketT("added")}{" "}
              <Link href="/basket">{basketT("view")}</Link>
            </p>
          ) : null}
          <button type="button" className="product-mobile-order-cta" disabled={!canAdd} onClick={addToBasket}>
            <span>{basketT("add")}</span>
            <strong>
              <MadPrice amount={merchandise} locale={locale} />
            </strong>
          </button>
        </>
      ) : (
        <div className="product-out-of-stock" role="status">
          {t("outOfStockMessage")}
        </div>
      )}
    </div>
  );
}
