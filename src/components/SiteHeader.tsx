"use client";

import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { MaterialIcon } from "@/components/MaterialIcon";
import { useBasket } from "@/components/BasketProvider";
import {
  getLocalizedCategoryLabel,
  type CategoryForClient,
} from "@/lib/category-serialize";
import type { AppLocale } from "@/lib/product-i18n";

type Props = { categories: CategoryForClient[] };

export function SiteHeader({ categories }: Props) {
  return (
    <Suspense fallback={<SiteHeaderFrame categories={categories} activeCategory={null} />}>
      <SiteHeaderWithCategory categories={categories} />
    </Suspense>
  );
}

function SiteHeaderWithCategory({ categories }: Props) {
  const activeCategory = useSearchParams().get("category");
  return <SiteHeaderFrame categories={categories} activeCategory={activeCategory} />;
}

function SiteHeaderFrame({
  categories,
  activeCategory,
}: Props & { activeCategory: string | null }) {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const basket = useBasket();
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  const navItem = (active: boolean) =>
    `store-nav-link shrink-0 ${active ? "store-nav-link-active" : "store-nav-link-idle"}`;

  const links = () =>
    categories.map((category) => {
      const label = getLocalizedCategoryLabel(category, locale);
      const active = activeCategory === category.name;
      return (
        <Link
          key={category.id}
          href={`/products?${new URLSearchParams({ category: category.name }).toString()}`}
          className={navItem(active)}
        >
          {label}
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-50 border-b border-brand-black/10 bg-brand-ivory/95 backdrop-blur-md">
      <p className="announcement-bar">{t("announcement")}</p>
      <nav className="relative mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 py-4 md:px-10">
        <Link href="/" className="inline-flex shrink-0 items-center" aria-label={`${brand("name")} Home`}>
          <BrandLogo height={42} priority variant="light" alt={brand("name")} />
        </Link>
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-8 overflow-x-auto md:flex">
          {links()}
        </div>
        <div className="flex shrink-0 items-center gap-3 md:gap-4">
          <Link href="/products" className="text-brand-black" aria-label={t("shop")}>
            <MaterialIcon name="search" className="!text-[22px]" />
          </Link>
          <Link href="/basket" className="basket-link text-brand-black" aria-label={t("basket")}>
            <MaterialIcon name="shopping_bag" className="!text-[22px]" />
            {basket.count > 0 ? <span className="basket-count">{basket.count}</span> : null}
          </Link>
          <LocaleSwitcher />
        </div>
      </nav>
      {categories.length > 0 ? (
        <div className="flex gap-5 overflow-x-auto px-5 pb-3 md:hidden">{links()}</div>
      ) : null}
    </header>
  );
}
