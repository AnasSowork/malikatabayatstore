"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProductForClient } from "@/lib/product-serialize";
import { getLocalizedProductFields } from "@/lib/product-i18n";
import type { AppLocale } from "@/lib/product-i18n";
import { formatMad } from "@/lib/format-price";
import { ProductImage } from "@/components/ProductImage";

type Props = {
  product: ProductForClient;
  isNew?: boolean;
  isExclusive?: boolean;
};

export function ProductCard({ product, isNew, isExclusive }: Props) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("products");
  const { name } = getLocalizedProductFields(product, locale);
  const variantLabel = product.categories[0] ?? "-";
  const image = product.images[0] ?? "https://via.placeholder.com/600x800?text=No+Image";
  const compareAtPrice = product.compareAtPrice == null ? null : Number(product.compareAtPrice);
  const discount =
    compareAtPrice && compareAtPrice > Number(product.price)
      ? Math.round(((compareAtPrice - Number(product.price)) / compareAtPrice) * 100)
      : 0;

  return (
    <article className="group">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative mb-6 aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low ring-1 ring-brand-gold/10 transition-all duration-500 group-hover:ring-brand-gold/30 group-hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.2)]">
          {isNew && (
            <div className="shop-badge absolute left-4 top-4 z-10 rounded-full bg-brand-black/85 px-3 py-1 text-white ring-1 ring-white/30 backdrop-blur-sm">
              {t("badgeNew")}
            </div>
          )}
          {isExclusive && !isNew && (
            <div className="shop-badge absolute left-4 top-4 z-10 rounded-full bg-white px-3 py-1 text-brand-black">
              {t("badgeExclusive")}
            </div>
          )}
          {discount > 0 ? (
            <div className="shop-badge absolute right-4 top-4 z-10 rounded-full bg-white px-3 py-1 text-brand-black">
              -{discount}%
            </div>
          ) : null}
          <ProductImage
            src={image}
            alt={name}
            width={600}
            height={800}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="card-scrim" aria-hidden />
          <div className="card-quickview" aria-hidden>
            <span className="card-quickview-pill">{t("view")}</span>
          </div>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="shop-product-name transition-colors group-hover:text-brand-gold-dark">
              {name}
            </h2>
            <p className="shop-product-meta mt-1">{variantLabel}</p>
          </div>
          <div className="shrink-0 text-end">
            <p className="shop-product-price brand-gold-text">
              {formatMad(product.price.toString(), locale)}
            </p>
            {compareAtPrice ? (
              <del className="font-store text-xs text-on-surface/40">
                {formatMad(compareAtPrice, locale)}
              </del>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
