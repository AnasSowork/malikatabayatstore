"use client";

import { useTranslations } from "next-intl";
import { SizeSelector } from "@/components/SizeSelector";
import { ColorVariantSelector } from "@/components/ColorVariantSelector";
import type { ProductColorVariant } from "@/lib/product-serialize";
import type { OrderLineItem } from "@/lib/bundle-offers";

type Props = {
  pieces: OrderLineItem[];
  colorVariants: ProductColorVariant[];
  onChange: (pieces: OrderLineItem[]) => void;
};

export function PieceConfigurator({ pieces, colorVariants, onChange }: Props) {
  const t = useTranslations("product");

  function updatePiece(index: number, patch: Partial<OrderLineItem>) {
    onChange(pieces.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <div className="space-y-6 rounded-xl border border-brand-gold/15 bg-brand-cream/30 p-5">
      <span className="font-sans text-xs uppercase tracking-widest text-on-surface">{t("choosePieces")}</span>
      <div className="space-y-8">
        {pieces.map((piece, index) => (
          <div key={index} className="space-y-4 border-b border-brand-gold/10 pb-6 last:border-0 last:pb-0">
            <span className="font-headline text-sm text-on-surface">{t("pieceN", { n: index + 1 })}</span>
            <SizeSelector
              selectedSize={piece.size}
              onSelect={(size) => updatePiece(index, { size })}
              compact
            />
            <ColorVariantSelector
              variants={colorVariants}
              selectedColor={piece.color}
              onSelect={(color) => updatePiece(index, { color })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
