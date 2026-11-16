"use client";

import { useTranslations } from "next-intl";
import { BrandButton } from "@/components/BrandButton";
import { ProductCard } from "@/components/ProductCard";
import type { ProductForClient } from "@/lib/product-serialize";

export function HomeEditSection({ products }: { products: ProductForClient[] }) {
  const t = useTranslations("home");
  if (products.length === 0) return null;

  return (
    <section className="bg-brand-ivory px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1440px]">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {products.slice(0, 8).map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <BrandButton href="/products" variant="outline">
            {t("viewCollection")} <span aria-hidden>→</span>
          </BrandButton>
        </div>
      </div>
    </section>
  );
}
