"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { SizeSelector } from "@/components/SizeSelector";
import { ColorVariantSelector } from "@/components/ColorVariantSelector";
import type { ProductColorVariant } from "@/lib/product-serialize";
import type { OrderLineItem } from "@/lib/bundle-offers";
import type { AppLocale } from "@/lib/product-i18n";
import {
  resolvePurchaseLabel,
  type ProductPurchaseUi,
} from "@/lib/product-detail-content";

type Props = {
  pieces: OrderLineItem[];
  colorVariants: ProductColorVariant[];
  availableSizes: string[];
  purchaseUi: ProductPurchaseUi;
  onChange: (pieces: OrderLineItem[]) => void;
  onColorChange?: (colorName: string) => void;
};

export function PieceConfigurator({
  pieces,
  colorVariants,
  availableSizes,
  purchaseUi,
  onChange,
  onColorChange,
}: Props) {
  const t = useTranslations("product");
  const locale = useLocale() as AppLocale;

  function updatePiece(index: number, patch: Partial<OrderLineItem>) {
    onChange(pieces.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    if (patch.color) onColorChange?.(patch.color);
  }

  const sizeLabel = resolvePurchaseLabel(purchaseUi.selectSizeLabel, locale, t("selectSize"));
  const colorLabel = resolvePurchaseLabel(purchaseUi.colorLabel, locale, t("colorVariant"));

  return (
    <div id="product-piece-configurator" className="piece-configurator">
      <div className="piece-configurator-list">
        {pieces.map((piece, index) => (
          <div
            key={index}
            id={`product-piece-${index}`}
            className="piece-configurator-item scroll-mt-28"
          >
            <span className="piece-configurator-piece-label">
              {resolvePurchaseLabel(purchaseUi.pieceLabel, locale, t("pieceN", { n: index + 1 }), {
                n: index + 1,
              })}
            </span>
            <SizeSelector
              selectedSize={piece.size}
              onSelect={(size) => updatePiece(index, { size })}
              sizes={availableSizes}
              compact
              label={sizeLabel}
            />
            <ColorVariantSelector
              variants={colorVariants}
              selectedColor={piece.color}
              onSelect={(color) => updatePiece(index, { color })}
              compact
              label={colorLabel}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
