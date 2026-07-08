"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SizeSelector } from "@/components/SizeSelector";
import { ColorVariantSelector } from "@/components/ColorVariantSelector";
import { BundleQuantitySelector } from "@/components/BundleQuantitySelector";
import { PieceConfigurator } from "@/components/PieceConfigurator";
import { OrderForm } from "@/components/OrderForm";
import type { ProductColorVariant } from "@/lib/product-serialize";
import type { AppLocale } from "@/lib/product-i18n";
import { findBundleOffer, type BundleOffer, type OrderLineItem } from "@/lib/bundle-offers";
import { DEFAULT_PRODUCT_SIZE } from "@/lib/product-sizes";
import { formatMad } from "@/lib/format-price";

type Props = {
  productId: string;
  unitPrice: number;
  colorVariants: ProductColorVariant[];
  bundleOffers: BundleOffer[];
  preferredColor?: string | null;
  onColorChange?: (colorName: string) => void;
};

function defaultPiece(colorVariants: ProductColorVariant[]): OrderLineItem {
  return {
    size: DEFAULT_PRODUCT_SIZE,
    color: colorVariants.length > 0 ? colorVariants[0].name : null,
  };
}

function buildPieces(
  quantity: number,
  colorVariants: ProductColorVariant[],
  prev: OrderLineItem[],
): OrderLineItem[] {
  const base = defaultPiece(colorVariants);
  return Array.from({ length: quantity }, (_, i) => prev[i] ?? { ...base });
}

export function ProductPurchasePanel({
  productId,
  unitPrice,
  colorVariants,
  bundleOffers,
  preferredColor,
  onColorChange,
}: Props) {
  const t = useTranslations("product");
  const locale = useLocale() as AppLocale;
  const defaultQty = bundleOffers[0]?.quantity ?? 1;

  const [selectedQuantity, setSelectedQuantity] = useState(defaultQty);
  const [pieces, setPieces] = useState<OrderLineItem[]>(() =>
    buildPieces(defaultQty, colorVariants, []),
  );

  useEffect(() => {
    if (!preferredColor) return;
    setPieces((prev) => {
      if (prev.length === 0) return prev;
      if (prev.every((p) => p.color === preferredColor)) return prev;
      return prev.map((p) => ({ ...p, color: preferredColor }));
    });
  }, [preferredColor]);

  const selectedOffer = useMemo(
    () => findBundleOffer(bundleOffers, selectedQuantity) ?? bundleOffers[0],
    [bundleOffers, selectedQuantity],
  );

  const totalPrice = selectedOffer?.price ?? unitPrice;
  const requiresColor = colorVariants.length > 0;
  const isMultiPiece = selectedQuantity > 1;

  function onQuantityChange(qty: number) {
    setSelectedQuantity(qty);
    setPieces((prev) => buildPieces(qty, colorVariants, prev));
  }

  function onSingleSizeChange(size: string) {
    setPieces([{ ...pieces[0], size }]);
  }

  function onSingleColorChange(color: string) {
    setPieces([{ ...pieces[0], color }]);
    onColorChange?.(color);
  }

  const singlePiece = pieces[0] ?? defaultPiece(colorVariants);
  const lineItemsValid =
    pieces.length === selectedQuantity &&
    pieces.every((p) => p.size && (!requiresColor || p.color));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between gap-4 border-b border-brand-gold/15 pb-4">
        <span className="font-sans text-xs uppercase tracking-widest text-on-surface-variant">{t("selectedTotal")}</span>
        <span className="font-headline text-2xl italic brand-gold-text md:text-3xl">
          {formatMad(totalPrice, locale)}
        </span>
      </div>

      <BundleQuantitySelector
        offers={bundleOffers}
        unitPrice={unitPrice}
        selectedQuantity={selectedQuantity}
        onSelect={onQuantityChange}
        locale={locale}
      />

      {isMultiPiece ? (
        <PieceConfigurator pieces={pieces} colorVariants={colorVariants} onChange={setPieces} />
      ) : (
        <>
          <SizeSelector selectedSize={singlePiece.size} onSelect={onSingleSizeChange} />
          <ColorVariantSelector
            variants={colorVariants}
            selectedColor={preferredColor ?? singlePiece.color}
            onSelect={onSingleColorChange}
          />
        </>
      )}

      <OrderForm
        productId={productId}
        quantity={selectedQuantity}
        totalPrice={totalPrice}
        lineItems={pieces}
        requiresColorSelection={requiresColor}
        canSubmit={lineItemsValid}
        locale={locale}
      />
    </div>
  );
}
