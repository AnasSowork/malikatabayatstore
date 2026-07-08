"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function SiteHeader() {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  const onShop = pathname === "/products" || pathname.startsWith("/products/");
  const navItem = (active: boolean) =>
    `store-nav-link ${active ? "store-nav-link-active" : "store-nav-link-idle"}`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/15 bg-brand-black/95 backdrop-blur-xl">
      <p className="announcement-bar">{t("announcement")}</p>
      <nav className="mx-auto flex w-full max-w-[1920px] items-center justify-between px-6 py-3.5 md:px-8 md:py-4">
        <div className="flex items-center gap-8 md:gap-10">
          <Link
            href="/"
            className="inline-flex items-center"
            aria-label={`${brand("name")} Home`}
          >
            <BrandLogo height={46} priority variant="dark" alt={brand("name")} />
          </Link>
          <div className="hidden items-center gap-8 md:flex">
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
        </div>
        <div className="flex items-center gap-3 md:gap-4 [&_select]:text-white">
          <LocaleSwitcher />
        </div>
      </nav>
      <div className="brand-divider opacity-60" aria-hidden />
    </header>
  );
}
