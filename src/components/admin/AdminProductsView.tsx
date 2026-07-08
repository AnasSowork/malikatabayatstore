"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import type { ProductForClient } from "@/lib/product-serialize";
import { formatMad } from "@/lib/format-price";
import type { AppLocale } from "@/lib/product-i18n";
import { getLocalizedProductFields } from "@/lib/product-i18n";

type Props = {
  products: ProductForClient[];
  deletingId: string | null;
  onEdit: (product: ProductForClient) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

export function AdminProductsView({ products, deletingId, onEdit, onDelete, onAdd }: Props) {
  const t = useTranslations("admin");
  const locale = useLocale() as AppLocale;
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const { name } = getLocalizedProductFields(p, locale);
      return (
        name.toLowerCase().includes(q) ||
        p.categories.some((c) => c.toLowerCase().includes(q)) ||
        p.colorVariants.some((v) => v.name.toLowerCase().includes(q))
      );
    });
  }, [products, search, locale]);

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h2 className="admin-section-title">{t("products")}</h2>
          <p className="admin-section-subtitle">{t("productsSubtitle", { count: products.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="admin-search-wrap">
            <MaterialIcon name="search" className="admin-search-icon" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchProductsPlaceholder")}
              className="admin-search-input"
            />
          </div>
          <button type="button" onClick={onAdd} className="admin-btn-primary">
            <MaterialIcon name="add" className="!text-lg" />
            {t("addNew")}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon="inventory_2"
          title={search.trim() ? t("noSearchResults") : t("noProducts")}
          description={search.trim() ? undefined : t("noProductsHint")}
          action={
            !search.trim() ? (
              <button type="button" onClick={onAdd} className="admin-btn-primary">
                <MaterialIcon name="add" className="!text-lg" />
                {t("addNew")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="admin-product-grid">
          {filtered.map((product) => {
            const { name } = getLocalizedProductFields(product, locale);
            const cover = product.images[0];
            const bundle2 = product.bundleOffers.find((o) => o.quantity === 2);
            const bundle3 = product.bundleOffers.find((o) => o.quantity === 3);

            return (
              <article key={product.id} className="admin-product-card">
                <div className="admin-product-thumb">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <MaterialIcon name="image" className="!text-4xl text-outline-variant" />
                  )}
                  {product.images.length > 1 ? (
                    <span className="admin-product-photo-count">+{product.images.length - 1}</span>
                  ) : null}
                </div>
                <div className="admin-product-body">
                  <h3 className="font-headline text-lg leading-snug text-on-surface line-clamp-2">{name}</h3>
                  <p className="mt-1 font-headline text-xl brand-gold-text">
                    {formatMad(product.price, locale)}
                  </p>
                  {(bundle2 || bundle3) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {bundle2 ? (
                        <span className="admin-bundle-tag">2 · {formatMad(bundle2.price, locale)}</span>
                      ) : null}
                      {bundle3 ? (
                        <span className="admin-bundle-tag">3 · {formatMad(bundle3.price, locale)}</span>
                      ) : null}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {product.categories.slice(0, 3).map((cat) => (
                      <span key={cat} className="admin-cat-tag">
                        {cat}
                      </span>
                    ))}
                  </div>
                  {product.colorVariants.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {product.colorVariants.map((v) => (
                        <span key={v.name} className="admin-color-dot" title={v.name}>
                          <span style={{ backgroundColor: v.hex || "#ccc" }} />
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="admin-product-actions">
                    <button type="button" onClick={() => onEdit(product)} className="admin-btn-ghost">
                      <MaterialIcon name="edit" className="!text-base" />
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === product.id}
                      onClick={() => onDelete(product.id)}
                      className="admin-btn-danger"
                    >
                      <MaterialIcon name="delete" className="!text-base" />
                      {deletingId === product.id ? t("deleting") : t("delete")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
