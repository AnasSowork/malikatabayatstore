"use client";

import { useTranslations } from "next-intl";
import type { ProductColorVariant } from "@/lib/product-serialize";

type Props = {
  variants: ProductColorVariant[];
  selectedColor: string | null;
  onSelect: (colorName: string) => void;
  compact?: boolean;
  label?: string;
};

export function ColorVariantSelector({ variants, selectedColor, onSelect, compact, label }: Props) {
  const t = useTranslations("product");
  if (variants.length === 0) return null;

  const colorLabel = label ?? t("colorVariant");

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <span className="text-sm text-on-surface-variant">{colorLabel}</span>
      <div className={`flex flex-wrap items-center ${compact ? "gap-2" : "gap-x-5 gap-y-2"}`} role="listbox" aria-label={colorLabel}>
        {variants.map((variant) => {
          const selected = selectedColor === variant.name;
          return (
            <button
              key={variant.name}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(variant.name)}
              className={
                selected
                  ? "inline-flex items-center gap-2 rounded-md bg-brand-black px-3 py-1.5 text-sm text-brand-ivory"
                  : "inline-flex items-center gap-2 px-1 py-1.5 text-sm text-on-surface/75 hover:text-on-surface"
              }
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-brand-black/15"
                style={{ backgroundColor: variant.hex || "#211C1A" }}
                aria-hidden
              />
              {variant.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
