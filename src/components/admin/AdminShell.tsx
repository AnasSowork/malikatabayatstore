"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/MaterialIcon";
import { BrandLogo } from "@/components/BrandLogo";
import type { AdminView } from "@/components/admin/types";

type Props = {
  view: AdminView;
  orderCount: number;
  children: ReactNode;
  header: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
};

const NAV: {
  view: AdminView;
  href: "/admin" | "/admin/orders" | "/admin/products" | "/admin/categories" | "/admin/home";
  icon: string;
  labelKey: "navDashboard" | "navOrders" | "navProducts" | "navCategories" | "navHome";
  badge?: boolean;
}[] = [
  { view: "overview", href: "/admin", icon: "dashboard", labelKey: "navDashboard" },
  { view: "orders", href: "/admin/orders", icon: "receipt_long", labelKey: "navOrders", badge: true },
  { view: "products", href: "/admin/products", icon: "inventory_2", labelKey: "navProducts" },
  { view: "categories", href: "/admin/categories", icon: "category", labelKey: "navCategories" },
  { view: "home", href: "/admin/home", icon: "home", labelKey: "navHome" },
];

function NavLink({
  active,
  href,
  icon,
  label,
  badge,
}: {
  active: boolean;
  href: string;
  icon: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`admin-nav-link ${active ? "admin-nav-link-active" : ""}`}
    >
      <MaterialIcon name={icon} className="!text-xl shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="admin-nav-badge">{badge > 99 ? "99+" : badge}</span>
      ) : null}
    </Link>
  );
}

export function AdminShell({ view, orderCount, children, header, onRefresh, refreshing }: Props) {
  const t = useTranslations("admin");
  const brand = useTranslations("brand");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="admin-root min-h-screen">
      {/* Mobile bottom nav */}
      <nav className="admin-mobile-nav lg:hidden" aria-label="Admin navigation">
        {NAV.map((item) => (
          <Link
            key={item.view}
            href={item.href}
            className={`admin-mobile-tab ${view === item.view ? "admin-mobile-tab-active" : ""}`}
          >
            <MaterialIcon name={item.icon} className="!text-[22px]" />
            <span>{t(item.labelKey)}</span>
            {item.badge && orderCount > 0 ? (
              <span className="admin-mobile-badge">{orderCount > 9 ? "9+" : orderCount}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="mx-auto flex max-w-[1680px]">
        {/* Desktop sidebar */}
        <aside className="admin-sidebar hidden lg:flex">
          <div className="admin-sidebar-inner">
            <Link href="/" className="admin-sidebar-logo">
              <BrandLogo height={44} variant="dark" alt={brand("name")} />
            </Link>
            <p className="admin-sidebar-eyebrow">{t("panelLabel")}</p>

            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.view}
                  active={view === item.view}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  badge={item.badge ? orderCount : undefined}
                />
              ))}
            </nav>

            <div className="admin-sidebar-footer">
              <Link href="/" className="admin-sidebar-action">
                <MaterialIcon name="storefront" className="!text-lg" />
                {t("viewShop")}
              </Link>
              <button type="button" onClick={() => void logout()} className="admin-sidebar-action admin-sidebar-action-muted">
                <MaterialIcon name="logout" className="!text-lg" />
                {t("logout")}
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="admin-main flex-1 pb-24 lg:pb-12">
          <header className="admin-header">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              {header}
              <div className="flex shrink-0 items-center gap-2">
                {onRefresh ? (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="admin-icon-btn"
                    title={t("refresh")}
                  >
                    <MaterialIcon name="refresh" className={`!text-xl ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                ) : null}
                <button type="button" onClick={() => void logout()} className="admin-icon-btn lg:hidden" title={t("logout")}>
                  <MaterialIcon name="logout" className="!text-xl" />
                </button>
              </div>
            </div>
          </header>

          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
