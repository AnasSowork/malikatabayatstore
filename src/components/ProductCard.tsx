"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProductForClient } from "@/lib/product-serialize";
import { getLocalizedProductFields } from "@/lib/product-i18n";
import type { AppLocale } from "@/lib/product-i18n";
import { MadPrice } from "@/components/MadPrice";
import { ProductImage } from "@/components/ProductImage";
import { MaterialIcon } from "@/components/MaterialIcon";

type Props = {
  product: ProductForClient;
  isNew?: boolean;
  isExclusive?: boolean;
};

export function ProductCard({ product, isNew }: Props) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("products");
  const productT = useTranslations("product");
  const { name } = getLocalizedProductFields(product, locale);
  const image = product.images[0] ?? "https://via.placeholder.com/600x800?text=No+Image";
  const [favorite, setFavorite] = useState(false);
  const swatches = product.colorVariants.slice(0, 4);

  return (
    <article className="group relative">
      <button
        type="button"
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center text-on-surface/70 transition-colors hover:text-on-surface"
        aria-label={favorite ? productT("removeFavorite") : productT("addFavorite")}
        aria-pressed={favorite}
        onClick={() => setFavorite((current) => !current)}
      >
        <MaterialIcon name={favorite ? "favorite" : "favorite_border"} className="!text-[20px]" />
      </button>
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-container-low">
          {isNew ? (
            <span className="absolute left-3 top-3 z-10 text-[10px] uppercase tracking-[0.18em] text-on-surface">
              {t("badgeNew")}
            </span>
          ) : null}
          <ProductImage
            src={image}
            alt={name}
            width={640}
            height={800}
            className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>
        <h2 className="shop-product-name mt-4">{name}</h2>
        <p className="shop-product-price mt-1">
          <MadPrice amount={product.price.toString()} locale={locale} />
        </p>
        {swatches.length > 0 ? (
          <div className="mt-3 flex items-center gap-1.5">
            {swatches.map((swatch) => (
              <span
                key={swatch.name}
                className="h-2.5 w-2.5 rounded-full border border-brand-black/20"
                style={{ backgroundColor: swatch.hex || "#211C1A" }}
                title={swatch.name}
              />
            ))}
          </div>
        ) : null}
      </Link>
    </article>
  );
}
