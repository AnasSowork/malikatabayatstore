"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/MaterialIcon";

export function MobileBottomNav() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  const onProducts = pathname === "/products" || pathname.startsWith("/products/");
  const onHome = pathname === "/";

  const item = (active: boolean) =>
    active ? "text-on-surface" : "text-on-surface/55";

  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex w-full justify-around border-t border-brand-black/10 bg-brand-ivory/95 py-3.5 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-label={t("aria")}
    >
      <Link href="/" className={`flex flex-col items-center gap-0.5 ${item(onHome)}`}>
        <MaterialIcon name="explore" className="!text-[22px]" filled={onHome} />
        <span className="shop-mobile-nav-label">{t("explore")}</span>
      </Link>
      <Link href="/products" className="flex flex-col items-center gap-0.5 text-on-surface/55">
        <MaterialIcon name="search" className="!text-[22px]" />
        <span className="shop-mobile-nav-label">{t("search")}</span>
      </Link>
      <Link href="/products" className={`flex flex-col items-center gap-0.5 ${item(onProducts)}`}>
        <MaterialIcon name="shopping_bag" className="!text-[22px]" filled={onProducts} />
        <span className="shop-mobile-nav-label">{t("shop")}</span>
      </Link>
      <span className="flex flex-col items-center gap-0.5 text-on-surface/35">
        <MaterialIcon name="person" className="!text-[22px]" />
        <span className="shop-mobile-nav-label">{t("profile")}</span>
      </span>
    </nav>
  );
}
