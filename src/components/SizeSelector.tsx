"use client";

import { useTranslations } from "next-intl";
import { PRODUCT_SIZES } from "@/lib/product-sizes";
import { MaterialIcon } from "@/components/MaterialIcon";

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
    <div className={compact ? "size-selector-compact space-y-2" : "space-y-3"}>
      <span className="text-sm text-on-surface-variant">{sizeLabel}</span>
      <div className={`flex flex-wrap items-center ${compact ? "gap-2" : "gap-x-5 gap-y-2"}`}>
        {sizes.map((size) => {
          const selected = selectedSize === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelect(size)}
              className={
                selected
                  ? "rounded-md bg-brand-black px-3 py-1.5 text-sm text-brand-ivory"
                  : "px-1 py-1.5 text-sm text-on-surface/75 hover:text-on-surface"
              }
              aria-pressed={selected}
            >
              {size}
            </button>
          );
        })}
      </div>
      {!compact ? (
        <p className="inline-flex items-center gap-2 text-sm text-on-surface">
          <MaterialIcon name="straighten" className="!text-base" />
          <span className="underline underline-offset-4">{t("sizeGuide")}</span>
        </p>
      ) : null}
    </div>
  );
}
