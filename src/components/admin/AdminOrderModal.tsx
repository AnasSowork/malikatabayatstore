"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { OrderWithProduct } from "@/components/admin/types";
import type { ProductForClient } from "@/lib/product-serialize";
import type { OrderLineItem } from "@/lib/bundle-offers";
import { findBundleOffer } from "@/lib/bundle-offers";
import { getLocalizedProductFields, type AppLocale } from "@/lib/product-i18n";

export type OrderFormState = {
  customerName: string;
  phone: string;
  city: string;
  productId: string;
  quantity: number;
  totalPrice: string;
  lineItems: OrderLineItem[];
};

export function emptyOrderForm(products: ProductForClient[]): OrderFormState {
  const product = products[0];
  const quantity = 1;
  const size = product?.availableSizes[0] ?? "M";
  const color = product?.colorVariants[0]?.name ?? null;
  const price = product
    ? String(findBundleOffer(product.bundleOffers, quantity)?.price ?? product.price)
    : "";
  return {
    customerName: "",
    phone: "",
    city: "",
    productId: product?.id ?? "",
    quantity,
    totalPrice: price,
    lineItems: product ? [{ size, color }] : [],
  };
}

export function orderToForm(order: OrderWithProduct): OrderFormState {
  return {
    customerName: order.customerName,
    phone: order.phone,
    city: order.city,
    productId: order.productId,
    quantity: order.quantity,
    totalPrice: order.totalPrice,
    lineItems:
      order.lineItems.length > 0
        ? order.lineItems
        : [{ size: order.product.availableSizes[0] ?? "M", color: order.selectedColor }],
  };
}

type Props = {
  open: boolean;
  editingId: string | null;
  products: ProductForClient[];
  form: OrderFormState;
  setForm: React.Dispatch<React.SetStateAction<OrderFormState>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function AdminOrderModal({
  open,
  editingId,
  products,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const t = useTranslations("admin");
  const locale = useLocale() as AppLocale;
  const [error, setError] = useState<string | null>(null);

  const product = useMemo(
    () => products.find((p) => p.id === form.productId) ?? null,
    [products, form.productId],
  );

  const quantities = useMemo(() => {
    if (!product) return [1];
    const qs = product.bundleOffers.map((o) => o.quantity).sort((a, b) => a - b);
    return qs.length > 0 ? qs : [1];
  }, [product]);

  if (!open) return null;

  function syncLineItems(nextProduct: ProductForClient, quantity: number, prev: OrderLineItem[]) {
    const size = nextProduct.availableSizes[0] ?? "M";
    const color = nextProduct.colorVariants[0]?.name ?? null;
    return Array.from({ length: quantity }, (_, i) => {
      const existing = prev[i];
      const nextSize =
        existing && nextProduct.availableSizes.includes(existing.size) ? existing.size : size;
      const nextColor =
        existing?.color && nextProduct.colorVariants.some((v) => v.name === existing.color)
          ? existing.color
          : color;
      return { size: nextSize, color: nextColor };
    });
  }

  function onProductChange(productId: string) {
    const next = products.find((p) => p.id === productId);
    if (!next) return;
    const quantity = findBundleOffer(next.bundleOffers, form.quantity)
      ? form.quantity
      : (next.bundleOffers[0]?.quantity ?? 1);
    const price = findBundleOffer(next.bundleOffers, quantity)?.price ?? Number(next.price);
    setForm((f) => ({
      ...f,
      productId,
      quantity,
      totalPrice: String(price),
      lineItems: syncLineItems(next, quantity, f.lineItems),
    }));
  }

  function onQuantityChange(quantity: number) {
    if (!product) return;
    const price = findBundleOffer(product.bundleOffers, quantity)?.price ?? Number(product.price) * quantity;
    setForm((f) => ({
      ...f,
      quantity,
      totalPrice: String(price),
      lineItems: syncLineItems(product, quantity, f.lineItems),
    }));
  }

  function updateLine(index: number, patch: Partial<OrderLineItem>) {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim() || !form.city.trim() || !form.productId) {
      setError(t("orderFormIncomplete"));
      return;
    }
    if (!/^0[5-7][0-9]{8}$/.test(form.phone.replace(/\D/g, "").slice(0, 10))) {
      setError(t("orderInvalidPhone"));
      return;
    }
    setError(null);
    onSubmit(e);
  }

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="admin-modal max-w-2xl" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <header className="admin-modal-header">
          <div>
            <p className="brand-eyebrow">{editingId ? t("editOrder") : t("addOrder")}</p>
            <h2 className="font-headline text-2xl text-on-surface">
              {editingId ? t("editOrder") : t("addOrder")}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="admin-icon-btn" aria-label={t("cancel")}>
            <MaterialIcon name="close" className="!text-xl" />
          </button>
        </header>

        <div className="admin-modal-body space-y-5">
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>{t("customer")}</span>
              <input
                required
                className="admin-input"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span>{t("phone")}</span>
              <input
                required
                className="admin-input"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("city")}</span>
              <input
                required
                className="admin-input"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span>{t("product")}</span>
              <select
                required
                className="admin-input"
                value={form.productId}
                onChange={(e) => onProductChange(e.target.value)}
              >
                {products.map((p) => {
                  const { name } = getLocalizedProductFields(p, locale);
                  return (
                    <option key={p.id} value={p.id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="admin-field">
              <span>{t("quantityLabel")}</span>
              <select
                className="admin-input"
                value={form.quantity}
                onChange={(e) => onQuantityChange(Number(e.target.value))}
              >
                {quantities.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>{t("amount")}</span>
              <input
                required
                className="admin-input"
                inputMode="decimal"
                value={form.totalPrice}
                onChange={(e) => setForm((f) => ({ ...f, totalPrice: e.target.value }))}
              />
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="admin-form-section-title">
              <MaterialIcon name="tune" className="!text-lg brand-gold-text" />
              {t("lineItemsLabel")}
            </h3>
            {form.lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-2 gap-3 rounded-xl border border-black/10 p-3">
                <label className="admin-field">
                  <span>
                    {t("size")} · {index + 1}
                  </span>
                  <select
                    className="admin-input"
                    value={item.size}
                    onChange={(e) => updateLine(index, { size: e.target.value })}
                  >
                    {(product?.availableSizes ?? [item.size]).map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>
                    {t("colorLabel")} · {index + 1}
                  </span>
                  <select
                    className="admin-input"
                    value={item.color ?? ""}
                    onChange={(e) => updateLine(index, { color: e.target.value || null })}
                    disabled={!product?.colorVariants.length}
                  >
                    {(product?.colorVariants ?? []).map((variant) => (
                      <option key={variant.name} value={variant.name}>
                        {variant.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-error">{error}</p> : null}
        </div>

        <footer className="admin-modal-footer">
          <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </button>
          <button type="submit" className="admin-btn-primary" disabled={saving || products.length === 0}>
            {saving ? t("saving") : editingId ? t("saveChanges") : t("addOrder")}
          </button>
        </footer>
      </form>
    </div>
  );
}
