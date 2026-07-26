"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { OrderWithProduct } from "@/components/admin/types";
import type { ProductForClient } from "@/lib/product-serialize";
import type { OrderLineItem } from "@/lib/bundle-offers";
import { findBundleOffer } from "@/lib/bundle-offers";
import { buildDefaultShippingDescription } from "@/lib/order-shipping";
import { canSendToOlivraison, ORDER_STATUSES, orderStatusTone } from "@/lib/order-status";
import { getLocalizedProductFields, type AppLocale } from "@/lib/product-i18n";
import type { OrderStatus } from "@prisma/client";

export type OrderFormState = {
  customerName: string;
  phone: string;
  city: string;
  productId: string;
  quantity: number;
  totalPrice: string;
  lineItems: OrderLineItem[];
  status: OrderStatus;
  statusNote: string;
  streetAddress: string;
  shippingComment: string;
  shippingDescription: string;
  shippingNoOpen: boolean;
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
    status: "PENDING",
    statusNote: "",
    streetAddress: "",
    shippingComment: "",
    shippingDescription: "",
    shippingNoOpen: false,
  };
}

export function orderToForm(order: OrderWithProduct, locale: AppLocale): OrderFormState {
  const lineItems =
    order.lineItems.length > 0
      ? order.lineItems
      : [{ size: order.product.availableSizes[0] ?? "M", color: order.selectedColor }];
  const shippingDescription =
    order.shippingDescription?.trim() ||
    buildDefaultShippingDescription({ ...order, lineItems }, locale);
  return {
    customerName: order.customerName,
    phone: order.phone,
    city: order.city,
    productId: order.productId,
    quantity: order.quantity,
    totalPrice: order.totalPrice,
    lineItems,
    status: order.status,
    statusNote: order.statusNote ?? "",
    streetAddress: order.streetAddress ?? "",
    shippingComment: order.shippingComment ?? "",
    shippingDescription,
    shippingNoOpen: order.shippingNoOpen,
  };
}

type Props = {
  open: boolean;
  editingId: string | null;
  products: ProductForClient[];
  form: OrderFormState;
  setForm: React.Dispatch<React.SetStateAction<OrderFormState>>;
  saving: boolean;
  shipping: boolean;
  olivraisonConfigured: boolean;
  olivraisonTrackingId: string | null;
  cities: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onSendToOlivraison: () => void;
  onCheckRisk?: () => void;
  riskMessage?: string | null;
  riskBusy?: boolean;
};

export function AdminOrderModal({
  open,
  editingId,
  products,
  form,
  setForm,
  saving,
  shipping,
  olivraisonConfigured,
  olivraisonTrackingId,
  cities,
  onClose,
  onSubmit,
  onSendToOlivraison,
  onCheckRisk,
  riskMessage,
  riskBusy,
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

  const shippingPreview = useMemo(() => {
    if (!product) return null;
    return {
      id: editingId ?? "preview",
      customerName: form.customerName,
      phone: form.phone,
      city: form.city,
      quantity: form.quantity,
      totalPrice: form.totalPrice,
      lineItems: form.lineItems,
      streetAddress: form.streetAddress,
      shippingComment: form.shippingComment,
      shippingDescription: form.shippingDescription,
      shippingNoOpen: form.shippingNoOpen,
      status: form.status,
      olivraisonTrackingId,
      product,
    };
  }, [editingId, form, olivraisonTrackingId, product]);

  const canShip = Boolean(
    editingId &&
      olivraisonConfigured &&
      !olivraisonTrackingId &&
      shippingPreview &&
      canSendToOlivraison(shippingPreview),
  );

  useEffect(() => {
    if (!open || !product) return;
    setForm((current) => {
      if (current.shippingDescription.trim()) return current;
      const draft = {
        ...current,
        product,
        id: editingId ?? "draft",
      } as OrderWithProduct;
      return {
        ...current,
        shippingDescription: buildDefaultShippingDescription(
          { ...draft, lineItems: current.lineItems, product },
          locale,
        ),
      };
    });
  }, [open, product, editingId, locale, setForm]);

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
    const lineItems = syncLineItems(next, quantity, form.lineItems);
    setForm((f) => ({
      ...f,
      productId,
      quantity,
      totalPrice: String(price),
      lineItems,
      shippingDescription: buildDefaultShippingDescription(
        {
          id: editingId ?? "draft",
          customerName: f.customerName,
          phone: f.phone,
          city: f.city,
          quantity,
          totalPrice: String(price),
          lineItems,
          product: next,
        },
        locale,
      ),
    }));
  }

  function onQuantityChange(quantity: number) {
    if (!product) return;
    const price = findBundleOffer(product.bundleOffers, quantity)?.price ?? Number(product.price) * quantity;
    const lineItems = syncLineItems(product, quantity, form.lineItems);
    setForm((f) => ({
      ...f,
      quantity,
      totalPrice: String(price),
      lineItems,
      shippingDescription: buildDefaultShippingDescription(
        {
          id: editingId ?? "draft",
          customerName: f.customerName,
          phone: f.phone,
          city: f.city,
          quantity,
          totalPrice: String(price),
          lineItems,
          product,
        },
        locale,
      ),
    }));
  }

  function updateLine(index: number, patch: Partial<OrderLineItem>) {
    setForm((f) => {
      const lineItems = f.lineItems.map((item, i) => (i === index ? { ...item, ...patch } : item));
      return {
        ...f,
        lineItems,
        shippingDescription: product
          ? buildDefaultShippingDescription(
              {
                id: editingId ?? "draft",
                customerName: f.customerName,
                phone: f.phone,
                city: f.city,
                quantity: f.quantity,
                totalPrice: f.totalPrice,
                lineItems,
                product,
              },
              locale,
            )
          : f.shippingDescription,
      };
    });
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

  function statusLabel(status: OrderStatus) {
    const key = `orderStatus${status.charAt(0)}${status.slice(1).toLowerCase()}` as
      | "orderStatusPending"
      | "orderStatusConfirmed"
      | "orderStatusShipped"
      | "orderStatusDelivered"
      | "orderStatusCancelled"
      | "orderStatusReturned";
    return t(key);
  }

  function handleSendClick() {
    onSendToOlivraison();
  }

  const addressReady = form.streetAddress.trim().length >= 3;

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
          {editingId ? (
            <div className="space-y-3">
              <h3 className="admin-form-section-title">
                <MaterialIcon name="label" className="!text-lg brand-gold-text" />
                {t("orderStatusSection")}
              </h3>
              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>{t("orderStatusLabel")}</span>
                  <select
                    className="admin-input"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as OrderStatus }))
                    }
                    disabled={Boolean(olivraisonTrackingId)}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${orderStatusTone(form.status)}`}
                  >
                    {statusLabel(form.status)}
                  </span>
                </div>
                <label className="admin-field lg:col-span-2">
                  <span>{t("orderStatusNote")}</span>
                  <textarea
                    className="admin-input min-h-[72px]"
                    value={form.statusNote}
                    onChange={(e) => setForm((f) => ({ ...f, statusNote: e.target.value }))}
                    placeholder={t("orderStatusNotePlaceholder")}
                  />
                </label>
              </div>
              {form.status === "PENDING" ? (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setForm((f) => ({ ...f, status: "CONFIRMED" }))}
                >
                  <MaterialIcon name="check_circle" className="!text-lg" />
                  {t("orderConfirm")}
                </button>
              ) : null}
            </div>
          ) : null}

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
                list={cities.length > 0 ? "order-olivraison-cities" : undefined}
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

          {cities.length > 0 ? (
            <datalist id="order-olivraison-cities">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          ) : null}

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

          {editingId ? (
            <div className="space-y-3">
              <h3 className="admin-form-section-title">
                <MaterialIcon name="local_shipping" className="!text-lg brand-gold-text" />
                {t("orderShippingSection")}
              </h3>
              {!olivraisonConfigured ? (
                <p className="text-sm text-on-surface-variant">{t("deliveryNotConfigured")}</p>
              ) : null}
              {olivraisonTrackingId ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                  <p className="font-medium text-emerald-900">{t("orderShippingSent")}</p>
                  <p className="mt-1 font-mono text-xs">{olivraisonTrackingId}</p>
                </div>
              ) : olivraisonConfigured ? (
                shipping ? (
                  <div className="order-ship-callout order-ship-callout-sending">
                    <div className="order-ship-spinner" aria-hidden />
                    <p className="order-ship-callout-title">{t("orderSending")}</p>
                    <p className="order-ship-callout-hint">{t("orderSendingHint")}</p>
                  </div>
                ) : canShip ? (
                  <div className="order-ship-callout order-ship-callout-ready">
                    <p className="order-ship-callout-title">
                      <MaterialIcon name="local_shipping" className="!text-xl text-blue-700" />
                      {t("orderShipReadyTitle")}
                    </p>
                    <p className="order-ship-callout-hint">{t("orderShipReadyHint")}</p>
                    <button
                      type="button"
                      className="order-ship-btn"
                      disabled={saving || shipping}
                      onClick={() => void handleSendClick()}
                    >
                      <MaterialIcon name="rocket_launch" className="!text-lg" />
                      {t("orderSendToOlivraison")}
                    </button>
                  </div>
                ) : (
                  <div className="order-ship-callout order-ship-callout-pending">
                    <p className="order-ship-callout-title">
                      <MaterialIcon name="info" className="!text-lg text-amber-700" />
                      {t("orderShipNotReadyTitle")}
                    </p>
                    {!addressReady ? (
                      <ul className="order-ship-callout-list">
                        <li>{t("orderShipMissingAddress")}</li>
                      </ul>
                    ) : null}
                  </div>
                )
              ) : null}
              <div className="admin-form-grid">
                <label className="admin-field lg:col-span-2">
                  <span>{t("orderStreetAddress")}</span>
                  <input
                    required={canShip}
                    minLength={3}
                    className="admin-input"
                    value={form.streetAddress}
                    onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))}
                    disabled={Boolean(olivraisonTrackingId)}
                  />
                </label>
                <label className="admin-field lg:col-span-2">
                  <span>{t("deliveryDescription")}</span>
                  <input
                    required={canShip}
                    minLength={3}
                    className="admin-input"
                    value={form.shippingDescription}
                    onChange={(e) => setForm((f) => ({ ...f, shippingDescription: e.target.value }))}
                    disabled={Boolean(olivraisonTrackingId)}
                  />
                </label>
                <label className="admin-field lg:col-span-2">
                  <span>{t("deliveryComment")}</span>
                  <input
                    className="admin-input"
                    value={form.shippingComment}
                    onChange={(e) => setForm((f) => ({ ...f, shippingComment: e.target.value }))}
                    disabled={Boolean(olivraisonTrackingId)}
                  />
                </label>
                <label className="flex items-center gap-2 lg:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.shippingNoOpen}
                    onChange={(e) => setForm((f) => ({ ...f, shippingNoOpen: e.target.checked }))}
                    disabled={Boolean(olivraisonTrackingId)}
                  />
                  <span className="text-sm">{t("deliveryNoOpen")}</span>
                </label>
                {onCheckRisk && !olivraisonTrackingId ? (
                  <div className="lg:col-span-2">
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      disabled={riskBusy || !form.phone.trim()}
                      onClick={onCheckRisk}
                    >
                      {t("deliveryRiskCheck")}
                    </button>
                    {riskMessage ? (
                      <p className="mt-2 text-sm text-on-surface-variant">{riskMessage}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-error">{error}</p> : null}
        </div>

        <footer className="admin-modal-footer flex-wrap">
          <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={saving || shipping}>
            {t("cancel")}
          </button>
          <button type="submit" className="admin-btn-primary" disabled={saving || shipping || products.length === 0}>
            {saving ? t("saving") : editingId ? t("saveChanges") : t("addOrder")}
          </button>
        </footer>
      </form>
    </div>
  );
}
