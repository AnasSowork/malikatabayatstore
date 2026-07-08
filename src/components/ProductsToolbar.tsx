"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

import type { CategoryForClient } from "@/lib/category-serialize";
import { getLocalizedCategoryLabel } from "@/lib/category-serialize";
import type { AppLocale } from "@/lib/product-i18n";
import { useLocale } from "next-intl";

type Props = {
  categories: CategoryForClient[];
};

function mergeParams(
  base: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): string {
  const p = new URLSearchParams(base.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") p.delete(k);
    else p.set(k, v);
  }
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function ProductsToolbar({ categories }: Props) {
  const t = useTranslations("products");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const sp = useSearchParams();
  const activeCategory = sp.get("category") ?? "";
  const activeSort = sp.get("sort") ?? "new";

  const pillActive =
    "shop-filter-pill rounded-full border border-brand-black bg-brand-black px-5 py-2.5 text-white shadow-[0_2px_12px_-2px_rgba(0,0,0,0.25)]";
  const pillIdle =
    "shop-filter-pill rounded-full border border-brand-black/20 bg-surface-container-low px-5 py-2.5 text-on-surface transition-colors hover:border-brand-black/45 hover:bg-brand-cream";

  return (
    <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/products${mergeParams(sp, { category: null })}`}
          className={!activeCategory ? pillActive : pillIdle}
        >
          {t("filterAll")}
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products${mergeParams(sp, { category: cat.name })}`}
            className={activeCategory === cat.name ? pillActive : pillIdle}
          >
            {getLocalizedCategoryLabel(cat, locale)}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 shop-toolbar-label">
        <span>{t("sortLabel")}</span>
        <div className="relative">
          <select
            className="shop-toolbar-label cursor-pointer appearance-none border-none bg-transparent pr-6 focus:ring-0"
            value={activeSort}
            onChange={(e) => {
              const sort = e.target.value;
              const path = `/products${mergeParams(sp, { sort: sort === "new" ? null : sort })}`;
              router.push(path);
            }}
            aria-label={t("sortLabel")}
          >
            <option value="new">{t("sortNewest")}</option>
            <option value="price_asc">{t("sortPriceLow")}</option>
            <option value="price_desc">{t("sortPriceHigh")}</option>
          </select>
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant">
            ▾
          </span>
        </div>
      </div>
    </div>
  );
}
