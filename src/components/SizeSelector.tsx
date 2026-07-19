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
          <span className="font-store text-xs font-semibold text-on-surface-variant">{t("selectSize")}</span>
          <button type="button" className="text-xs text-secondary underline underline-offset-4">
            {t("sizeGuide")}
          </button>
        </div>
      ) : (
        <span className="font-store text-xs font-semibold text-on-surface-variant">{t("selectSize")}</span>
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
              className={`flex h-10 items-center justify-center rounded-full border font-store text-sm font-semibold transition-all hover:border-primary ${
                wide ? "min-w-[2.75rem] px-3" : "w-10"
              } ${
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
