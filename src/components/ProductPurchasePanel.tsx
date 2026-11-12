"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SizeSelector } from "@/components/SizeSelector";
import { ColorVariantSelector } from "@/components/ColorVariantSelector";
import { BundleQuantitySelector } from "@/components/BundleQuantitySelector";
import { PieceConfigurator } from "@/components/PieceConfigurator";
import { OrderForm } from "@/components/OrderForm";
import type { ProductColorVariant } from "@/lib/product-serialize";
import type { AppLocale } from "@/lib/product-i18n";
import { storefrontOffer, type BundleOffer, type OrderLineItem } from "@/lib/bundle-offers";
import { MadPrice } from "@/components/MadPrice";
import { DEFAULT_PRODUCT_SIZE } from "@/lib/product-sizes";
import type { ProductPurchaseUi } from "@/lib/product-detail-content";

type Props = {
  productId: string;
  productName: string;
  unitPrice: number;
  deliveryFee: number;
  colorVariants: ProductColorVariant[];
  bundleOffers: BundleOffer[];
  availableSizes: string[];
  inStock: boolean;
  preferredColor?: string | null;
  purchaseUi: ProductPurchaseUi;
  onColorChange?: (colorName: string) => void;
};

function defaultPiece(colorVariants: ProductColorVariant[], availableSizes: string[]): OrderLineItem {
  return {
    size: availableSizes[0] ?? DEFAULT_PRODUCT_SIZE,
    color: colorVariants.length > 0 ? colorVariants[0].name : null,
  };
}

function buildPieces(
  quantity: number,
  colorVariants: ProductColorVariant[],
  availableSizes: string[],
  prev: OrderLineItem[],
): OrderLineItem[] {
  const base = defaultPiece(colorVariants, availableSizes);
  return Array.from({ length: quantity }, (_, i) => prev[i] ?? { ...base });
}

export function ProductPurchasePanel({
  productId,
  productName,
  unitPrice,
  deliveryFee,
  colorVariants,
  bundleOffers,
  availableSizes,
  inStock,
  preferredColor,
  purchaseUi,
  onColorChange,
}: Props) {
  const t = useTranslations("product");
  const locale = useLocale() as AppLocale;
  const offer = storefrontOffer(bundleOffers, unitPrice);
  const selectedQuantity = offer.quantity;
  const [pieces, setPieces] = useState<OrderLineItem[]>(() =>
    buildPieces(offer.quantity, colorVariants, availableSizes, []),
  );

  const totalPrice = offer.price;

  useEffect(() => {
    if (!preferredColor) return;
    setPieces((prev) => {
      if (prev.length !== 1) return prev;
      if (prev[0]?.color === preferredColor) return prev;
      return [{ ...prev[0], color: preferredColor }];
    });
  }, [preferredColor]);

  const requiresColor = colorVariants.length > 0;
  const isMultiPiece = selectedQuantity > 1;

  function onSingleSizeChange(size: string) {
    setPieces([{ ...pieces[0], size }]);
  }

  function onSingleColorChange(color: string) {
    setPieces([{ ...pieces[0], color }]);
    onColorChange?.(color);
  }

  const singlePiece = pieces[0] ?? defaultPiece(colorVariants, availableSizes);
  const lineItemsValid =
    pieces.length === selectedQuantity &&
    pieces.every((p) => p.size && (!requiresColor || p.color));

  return (
    <div className="product-purchase-panel">
      <BundleQuantitySelector offer={offer} locale={locale} />

      {isMultiPiece ? (
        <PieceConfigurator
          pieces={pieces}
          colorVariants={colorVariants}
          availableSizes={availableSizes}
          purchaseUi={purchaseUi}
          onChange={setPieces}
          onColorChange={onColorChange}
        />
      ) : (
        <>
          <ColorVariantSelector
            variants={colorVariants}
            selectedColor={preferredColor ?? singlePiece.color}
            onSelect={onSingleColorChange}
          />
          <SizeSelector
            selectedSize={singlePiece.size}
            onSelect={onSingleSizeChange}
            sizes={availableSizes}
          />
        </>
      )}

      {inStock ? (
        <OrderForm
          productId={productId}
          productName={productName}
          quantity={selectedQuantity}
          totalPrice={totalPrice}
          deliveryFee={deliveryFee}
          lineItems={pieces}
          requiresColorSelection={requiresColor}
          canSubmit={lineItemsValid}
          locale={locale}
        />
      ) : (
        <div className="product-out-of-stock" role="status">
          {t("outOfStockMessage")}
        </div>
      )}

      {inStock ? (
        <a href="#order-form" className="product-mobile-order-cta">
          <span>{t("submit")}</span>
          <strong>
            <MadPrice amount={totalPrice + deliveryFee} locale={locale} />
          </strong>
        </a>
      ) : null}
    </div>
  );
}
