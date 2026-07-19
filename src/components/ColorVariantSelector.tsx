"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { ProductColorVariant } from "@/lib/product-serialize";

type Props = {
  variants: ProductColorVariant[];
  selectedColor: string | null;
  onSelect: (colorName: string) => void;
};

function isLightHex(hex: string | null): boolean {
  if (!hex) return false;
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return false;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export function ColorVariantSelector({ variants, selectedColor, onSelect }: Props) {
  const t = useTranslations("product");
  if (variants.length === 0) return null;

  return (
    <div className="color-variant-picker">
      <div className="color-variant-picker-head">
        <span className="shop-toolbar-label">{t("colorVariant")}</span>
      </div>

      <div className="color-variant-picker-rail" role="listbox" aria-label={t("colorVariant")}>
        {variants.map((variant) => {
          const selected = selectedColor === variant.name;
          const light = isLightHex(variant.hex);
          return (
            <button
              key={variant.name}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(variant.name)}
              className={`color-variant-swatch ${selected ? "color-variant-swatch-selected" : ""}`}
              title={variant.name}
            >
              <span
                className={`color-variant-swatch-inner ${light ? "color-variant-swatch-light" : ""}`}
                style={{ backgroundColor: variant.hex || "#cccccc" }}
              >
                {selected ? (
                  <MaterialIcon
                    name="check"
                    className={`!text-sm ${light ? "!text-brand-black" : "!text-white"}`}
                  />
                ) : null}
              </span>
              <span className="color-variant-swatch-label">{variant.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
