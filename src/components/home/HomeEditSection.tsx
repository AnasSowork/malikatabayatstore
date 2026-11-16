"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandButton } from "@/components/BrandButton";
import { ProductCard } from "@/components/ProductCard";
import type { CategoryForClient } from "@/lib/category-serialize";
import { getLocalizedCategoryLabel } from "@/lib/category-serialize";
import type { AppLocale } from "@/lib/product-i18n";
import type { ProductForClient } from "@/lib/product-serialize";

export function HomeEditSection({
  products,
  categories,
}: {
  products: ProductForClient[];
  categories: CategoryForClient[];
}) {
  const t = useTranslations("home");
  const emptyLabel = useTranslations("products");
  const locale = useLocale() as AppLocale;
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const active = categories.find((category) => category.id === activeId) ?? categories[0];
  const visible = useMemo(() => {
    const list = active
      ? products.filter((product) => product.categories.includes(active.name))
      : products;
    return list.slice(0, 4);
  }, [active, products]);

  if (products.length === 0 && categories.length === 0) return null;

  const shopHref = active
    ? `/products?${new URLSearchParams({ category: active.name }).toString()}`
    : "/products";

  return (
    <section className="bg-brand-ivory px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1440px]">
        {categories.length > 0 ? (
          <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {categories.map((category) => {
              const on = category.id === active?.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveId(category.id)}
                  className={`pb-2 text-sm ${
                    on
                      ? "border-b border-brand-black font-medium text-on-surface"
                      : "text-on-surface/55 hover:text-on-surface"
                  }`}
                >
                  {getLocalizedCategoryLabel(category, locale)}
                </button>
              );
            })}
          </div>
        ) : null}
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-on-surface-variant">{emptyLabel("empty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {visible.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-12 flex justify-center">
          <BrandButton href={shopHref} variant="outline">
            {t("viewCollection")} <span aria-hidden>→</span>
          </BrandButton>
        </div>
      </div>
    </section>
  );
}
