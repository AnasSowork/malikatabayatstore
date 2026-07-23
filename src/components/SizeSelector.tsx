"use client";

import { useTranslations } from "next-intl";
import { PRODUCT_SIZES } from "@/lib/product-sizes";

type Props = {
  selectedSize: string;
  onSelect: (size: string) => void;
  compact?: boolean;
  sizes?: readonly string[];
  label?: string;
};

export function SizeSelector({ selectedSize, onSelect, compact, sizes = PRODUCT_SIZES, label }: Props) {
  const t = useTranslations("product");
  const sizeLabel = label ?? t("selectSize");

  return (
    <div className={compact ? "size-selector-compact space-y-2" : "space-y-4"}>
      {!compact ? (
        <div className="flex items-center justify-between">
          <span className="font-store text-xs font-semibold text-on-surface-variant">{sizeLabel}</span>
          <button type="button" className="text-xs text-secondary underline underline-offset-4">
            {t("sizeGuide")}
          </button>
        </div>
      ) : (
        <span className="font-store text-[10px] font-semibold text-on-surface-variant">{sizeLabel}</span>
      )}
      <div className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
        {sizes.map((size) => {
          const selected = selectedSize === size;
          const wide = size.length > 1;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelect(size)}
              className={`flex items-center justify-center rounded-full border font-store font-semibold transition-all hover:border-primary ${
                compact
                  ? `h-7 text-[10px] ${wide ? "min-w-[2rem] px-2" : "w-7"}`
                  : `h-8 text-xs ${wide ? "min-w-[2.35rem] px-2.5" : "w-8"}`
              } ${
                selected
                  ? "border-black bg-black text-white shadow-sm"
                  : "border-outline-variant text-on-surface hover:bg-surface-container-low"
              }`}
              aria-pressed={selected}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
