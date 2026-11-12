"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandButton } from "@/components/BrandButton";
import { ProductCard } from "@/components/ProductCard";
import type { ProductForClient } from "@/lib/product-serialize";

const TABS = [
  { id: "best", labelKey: "tabBest" as const, category: null },
  { id: "classic", labelKey: "categoryClassic" as const, category: "Classic" },
  { id: "embroidered", labelKey: "categoryEmbroidered" as const, category: "Embroidered" },
  { id: "new", labelKey: "categoryNew" as const, category: "New" },
];

export function HomeEditSection({ products }: { products: ProductForClient[] }) {
  const t = useTranslations("home");
  const [tab, setTab] = useState("best");
  const active = TABS.find((item) => item.id === tab) ?? TABS[0];
  const visible = useMemo(() => {
    const list = active.category
      ? products.filter((product) => product.categories.includes(active.category!))
      : products;
    return list.slice(0, 4);
  }, [active.category, products]);

  return (
    <section className="bg-brand-ivory px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {TABS.map((item) => {
            const on = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`pb-2 text-sm ${
                  on
                    ? "border-b border-brand-black font-medium text-on-surface"
                    : "text-on-surface/55 hover:text-on-surface"
                }`}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-on-surface-variant">{t("viewCollection")}</p>
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
          <BrandButton href="/products" variant="outline">
            {t("viewCollection")} <span aria-hidden>→</span>
          </BrandButton>
        </div>
      </div>
    </section>
  );
}
