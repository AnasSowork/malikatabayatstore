"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminLineItems } from "@/components/admin/AdminLineItems";
import {
  AdminOrderModal,
  emptyOrderForm,
  orderToForm,
  type OrderFormState,
} from "@/components/admin/AdminOrderModal";
import type { OrderWithProduct } from "@/components/admin/types";
import type { ProductForClient } from "@/lib/product-serialize";
import { formatMad } from "@/lib/format-price";
import type { AppLocale } from "@/lib/product-i18n";
import { getLocalizedProductFields } from "@/lib/product-i18n";

type Props = {
  orders: OrderWithProduct[];
  products: ProductForClient[];
  compact?: boolean;
  onChanged?: () => void;
};

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

export function AdminOrdersView({ orders, products, compact, onChanged }: Props) {
  const t = useTranslations("admin");
  const locale = useLocale() as AppLocale;
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrderFormState>(() => emptyOrderForm(products));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (!q) return compact ? sorted.slice(0, 8) : sorted;
    return sorted.filter((o) => {
      const { name } = getLocalizedProductFields(o.product, locale);
      return (
        o.customerName.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.city.toLowerCase().includes(q)
      );
    });
  }, [orders, search, locale, compact]);

  function handleCopyPhone(orderId: string, phone: string) {
    copyText(phone);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyOrderForm(products));
    setModalOpen(true);
  }

  function openEdit(order: OrderWithProduct) {
    setEditingId(order.id);
    setForm(orderToForm(order));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        city: form.city,
        productId: form.productId,
        quantity: form.quantity,
        totalPrice: Number(form.totalPrice),
        lineItems: form.lineItems,
      };
      const res = await fetch(editingId ? `/api/orders/${editingId}` : "/api/orders", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error || t("orderSaveError"));
        return;
      }
      closeModal();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(order: OrderWithProduct) {
    if (!window.confirm(t("orderDeleteConfirm", { name: order.customerName }))) return;
    setDeletingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert(t("orderDeleteError"));
        return;
      }
      onChanged?.();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h2 className="admin-section-title">{compact ? t("recentActivity") : t("orders")}</h2>
          {!compact ? (
            <p className="admin-section-subtitle">{t("ordersSubtitle", { count: orders.length })}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!compact ? (
            <button
              type="button"
              className="admin-btn-primary"
              onClick={openCreate}
              disabled={products.length === 0}
            >
              <MaterialIcon name="add" className="!text-lg" />
              {t("addOrder")}
            </button>
          ) : null}
          <div className="admin-search-wrap">
            <MaterialIcon name="search" className="admin-search-icon" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="admin-search-input"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon="receipt_long"
          title={search.trim() ? t("noSearchResults") : t("noOrders")}
          description={search.trim() ? undefined : t("noOrdersHint")}
        />
      ) : (
        <>
          <div className="admin-table-wrap hidden md:block">
            <table className="admin-table">
              <thead>
                <tr>
                  {!compact ? <th>{t("customer")}</th> : <th>{t("orderId")}</th>}
                  <th>{t("product")}</th>
                  {!compact ? <th>{t("phone")}</th> : null}
                  {!compact ? <th>{t("city")}</th> : null}
                  <th>{t("quantityLabel")}</th>
                  <th>{t("lineItemsLabel")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("date")}</th>
                  {!compact ? <th>{t("actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const { name } = getLocalizedProductFields(order.product, locale);
                  return (
                    <tr key={order.id}>
                      <td className="font-medium">
                        {compact ? (
                          <span className="font-mono text-xs text-on-surface-variant">
                            {order.id.slice(0, 8)}
                          </span>
                        ) : (
                          order.customerName
                        )}
                      </td>
                      <td>{name}</td>
                      {!compact ? (
                        <td>
                          <button
                            type="button"
                            className="admin-copy-link"
                            onClick={() => handleCopyPhone(order.id, order.phone)}
                          >
                            {order.phone}
                            <MaterialIcon
                              name={copiedId === order.id ? "check" : "content_copy"}
                              className="!text-sm"
                            />
                          </button>
                        </td>
                      ) : null}
                      {!compact ? <td>{order.city}</td> : null}
                      <td>
                        <span className="admin-qty-badge">{order.quantity}</span>
                      </td>
                      <td className="max-w-[240px]">
                        <AdminLineItems items={order.lineItems} />
                      </td>
                      <td className="font-semibold brand-gold-text whitespace-nowrap">
                        {formatMad(order.totalPrice, locale)}
                      </td>
                      <td className="whitespace-nowrap text-on-surface-variant text-xs">
                        {new Date(order.createdAt).toLocaleString(locale, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      {!compact ? (
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="admin-icon-btn"
                              aria-label={t("edit")}
                              onClick={() => openEdit(order)}
                            >
                              <MaterialIcon name="edit" className="!text-lg" />
                            </button>
                            <button
                              type="button"
                              className="admin-icon-btn"
                              aria-label={t("delete")}
                              disabled={deletingId === order.id}
                              onClick={() => void onDelete(order)}
                            >
                              <MaterialIcon name="delete" className="!text-lg" />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((order) => {
              const { name } = getLocalizedProductFields(order.product, locale);
              return (
                <article key={order.id} className="admin-order-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-on-surface">{order.customerName}</p>
                      <p className="mt-0.5 text-sm text-on-surface-variant">{name}</p>
                    </div>
                    <p className="font-headline text-lg brand-gold-text">
                      {formatMad(order.totalPrice, locale)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                    <span className="admin-meta-pill">
                      <MaterialIcon name="call" className="!text-sm" />
                      <button type="button" onClick={() => handleCopyPhone(order.id, order.phone)}>
                        {order.phone}
                      </button>
                    </span>
                    <span className="admin-meta-pill">
                      <MaterialIcon name="location_on" className="!text-sm" />
                      {order.city}
                    </span>
                    <span className="admin-meta-pill">
                      <MaterialIcon name="inventory_2" className="!text-sm" />
                      ×{order.quantity}
                    </span>
                  </div>
                  <div className="mt-3">
                    <AdminLineItems items={order.lineItems} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                      {new Date(order.createdAt).toLocaleString(locale)}
                    </p>
                    {!compact ? (
                      <div className="flex gap-1">
                        <button type="button" className="admin-btn-ghost" onClick={() => openEdit(order)}>
                          {t("edit")}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-danger"
                          disabled={deletingId === order.id}
                          onClick={() => void onDelete(order)}
                        >
                          {t("delete")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {!compact ? (
        <AdminOrderModal
          open={modalOpen}
          editingId={editingId}
          products={products}
          form={form}
          setForm={setForm}
          saving={saving}
          onClose={closeModal}
          onSubmit={(e) => void onSubmit(e)}
        />
      ) : null}
    </section>
  );
}
