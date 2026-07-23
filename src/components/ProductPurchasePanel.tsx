"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SizeSelector } from "@/components/SizeSelector";
import { ColorVariantSelector } from "@/components/ColorVariantSelector";
import { BundleQuantitySelector } from "@/components/BundleQuantitySelector";
import { PieceConfigurator } from "@/components/PieceConfigurator";
import { OrderForm } from "@/components/OrderForm";
import type { ProductColorVariant } from "@/lib/product-serialize";
import type { AppLocale } from "@/lib/product-i18n";
import { findBundleOffer, type BundleOffer, type OrderLineItem } from "@/lib/bundle-offers";
import { MadPrice } from "@/components/MadPrice";
import { DEFAULT_PRODUCT_SIZE } from "@/lib/product-sizes";
import type { ProductPurchaseUi } from "@/lib/product-detail-content";
import { trackAddToCart } from "@/lib/meta-pixel-events";

type Props = {
  productId: string;
  productName: string;
  unitPrice: number;
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
  const defaultQty = bundleOffers[0]?.quantity ?? 1;

  const [selectedQuantity, setSelectedQuantity] = useState(defaultQty);
  const [pieces, setPieces] = useState<OrderLineItem[]>(() =>
    buildPieces(defaultQty, colorVariants, availableSizes, []),
  );
  const addToCartSent = useRef<Set<number>>(new Set());

  const selectedOffer = useMemo(
    () => findBundleOffer(bundleOffers, selectedQuantity) ?? bundleOffers[0],
    [bundleOffers, selectedQuantity],
  );

  const totalPrice = selectedOffer?.price ?? unitPrice;

  function fireAddToCart(qty: number, price: number) {
    if (addToCartSent.current.has(qty)) return;
    addToCartSent.current.add(qty);
    trackAddToCart({
      productId,
      productName,
      value: price,
      quantity: qty,
      unitPrice: price / qty,
    });
  }

  useEffect(() => {
    fireAddToCart(defaultQty, selectedOffer?.price ?? unitPrice);
    // Initial bundle tier only — user-driven changes handled in onQuantityChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

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

  function scrollToPiece(index: number) {
    window.setTimeout(() => {
      document.getElementById(`product-piece-${index}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  }

  function onQuantityChange(qty: number) {
    const prevQty = selectedQuantity;
    setSelectedQuantity(qty);
    setPieces((prev) => buildPieces(qty, colorVariants, availableSizes, prev));

    const offer = findBundleOffer(bundleOffers, qty) ?? bundleOffers[0];
    fireAddToCart(qty, offer?.price ?? unitPrice);

    if (qty > 1 && qty > prevQty) {
      scrollToPiece(qty - 1);
    }
  }

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
      <BundleQuantitySelector
        offers={bundleOffers}
        unitPrice={unitPrice}
        selectedQuantity={selectedQuantity}
        onSelect={onQuantityChange}
        locale={locale}
      />

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
          <SizeSelector
            selectedSize={singlePiece.size}
            onSelect={onSingleSizeChange}
            sizes={availableSizes}
          />
          <ColorVariantSelector
            variants={colorVariants}
            selectedColor={preferredColor ?? singlePiece.color}
            onSelect={onSingleColorChange}
          />
        </>
      )}

      {inStock ? (
        <OrderForm
          productId={productId}
          productName={productName}
          quantity={selectedQuantity}
          totalPrice={totalPrice}
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
            <MadPrice amount={totalPrice} locale={locale} />
          </strong>
        </a>
      ) : null}
    </div>
  );
}
