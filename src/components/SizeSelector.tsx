"use client";

import { useTranslations } from "next-intl";
import { PRODUCT_SIZES } from "@/lib/product-sizes";

type Props = {
  selectedSize: string;
  onSelect: (size: string) => void;
  compact?: boolean;
  sizes?: readonly string[];
};

export function SizeSelector({ selectedSize, onSelect, compact, sizes = PRODUCT_SIZES }: Props) {
  const t = useTranslations("product");

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact ? (
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs uppercase tracking-widest text-on-surface">{t("selectSize")}</span>
          <button type="button" className="text-xs text-secondary underline underline-offset-4">
            {t("sizeGuide")}
          </button>
        </div>
      ) : (
        <span className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant">{t("selectSize")}</span>
      )}
      <div className="flex flex-wrap gap-2.5">
        {sizes.map((size) => {
          const selected = selectedSize === size;
          const wide = size.length > 1;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelect(size)}
              className={`flex items-center justify-center rounded-full border font-sans font-medium transition-all hover:border-primary ${
                compact ? "h-10 text-xs" : "h-12 text-sm"
              } ${wide ? (compact ? "min-w-[2.75rem] px-3" : "min-w-[3.25rem] px-4") : compact ? "w-10" : "w-12"} ${
                selected
                  ? "border-primary bg-primary/5 text-on-surface"
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
