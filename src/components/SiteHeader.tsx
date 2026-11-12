"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { MaterialIcon } from "@/components/MaterialIcon";

export function SiteHeader() {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  const onShop = pathname === "/products" || pathname.startsWith("/products/");
  const navItem = (active: boolean) =>
    `store-nav-link ${active ? "store-nav-link-active" : "store-nav-link-idle"}`;

  return (
    <header className="sticky top-0 z-50 border-b border-brand-black/10 bg-brand-ivory/95 backdrop-blur-md">
      <p className="announcement-bar">{t("announcement")}</p>
      <nav className="relative mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-4 md:px-10">
        <Link href="/" className="inline-flex items-center" aria-label={`${brand("name")} Home`}>
          <BrandLogo height={42} priority variant="light" alt={brand("name")} />
        </Link>
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <Link href="/products?category=New" className={navItem(false)}>
            {t("newIn")}
          </Link>
          <Link href="/products" className={navItem(onShop)}>
            {t("shop")}
          </Link>
          <Link href="/products?category=Classic" className={navItem(false)}>
            {t("classic")}
          </Link>
          <Link href="/products?category=Embroidered" className={navItem(false)}>
            {t("embroidered")}
          </Link>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/products" className="text-brand-black" aria-label={t("shop")}>
            <MaterialIcon name="search" className="!text-[22px]" />
          </Link>
          <LocaleSwitcher />
        </div>
      </nav>
      <div className="flex gap-5 overflow-x-auto px-5 pb-3 md:hidden">
        <Link href="/products?category=New" className={navItem(false)}>
          {t("newIn")}
        </Link>
        <Link href="/products" className={navItem(onShop)}>
          {t("shop")}
        </Link>
        <Link href="/products?category=Classic" className={navItem(false)}>
          {t("classic")}
        </Link>
        <Link href="/products?category=Embroidered" className={navItem(false)}>
          {t("embroidered")}
        </Link>
      </div>
    </header>
  );
}
