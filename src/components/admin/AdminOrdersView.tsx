"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  canSendToOlivraison,
  isOrderShipped,
  isShippingReady,
  matchesOrderFilter,
  orderStatusTone,
  type OrderFilterKey,
} from "@/lib/order-status";
import type { OrderStatus } from "@prisma/client";

type Props = {
  orders: OrderWithProduct[];
  products: ProductForClient[];
  compact?: boolean;
  onChanged?: () => void;
};

const FILTER_KEYS: OrderFilterKey[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function buildPayload(form: OrderFormState) {
  return {
    customerName: form.customerName,
    phone: form.phone,
    city: form.city,
    productId: form.productId,
    quantity: form.quantity,
    totalPrice: Number(form.totalPrice),
    lineItems: form.lineItems,
    status: form.status,
    statusNote: form.statusNote.trim() || null,
    streetAddress: form.streetAddress.trim() || null,
    shippingComment: form.shippingComment.trim() || null,
    shippingDescription: form.shippingDescription.trim() || null,
    shippingNoOpen: form.shippingNoOpen,
  };
}

export function AdminOrdersView({ orders, products, compact, onChanged }: Props) {
  const t = useTranslations("admin");
  const locale = useLocale() as AppLocale;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderFilterKey>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrderFormState>(() => emptyOrderForm(products));
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [olivraisonConfigured, setOlivraisonConfigured] = useState(false);
  const [riskMessage, setRiskMessage] = useState<string | null>(null);
  const [riskBusy, setRiskBusy] = useState(false);

  const editingOrder = useMemo(
    () => orders.find((order) => order.id === editingId) ?? null,
    [orders, editingId],
  );

  const loadDeliveryMeta = useCallback(async () => {
    if (compact) return;
    try {
      const res = await fetch("/api/admin/delivery?resource=dashboard&limit=1");
      if (!res.ok) return;
      const data = (await res.json()) as {
        configured?: boolean;
        cities?: Array<{ name: string }>;
      };
      setOlivraisonConfigured(Boolean(data.configured));
      setCities((data.cities ?? []).map((city) => city.name));
    } catch {
      // ignore — shipping UI still works without city list
    }
  }, [compact]);

  useEffect(() => {
    void loadDeliveryMeta();
  }, [loadDeliveryMeta]);

  const filterCounts = useMemo(() => {
    const counts: Record<OrderFilterKey, number> = {
      ALL: orders.length,
      PENDING: 0,
      CONFIRMED: 0,
      READY_TO_SHIP: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      RETURNED: 0,
    };
    for (const order of orders) {
      for (const key of FILTER_KEYS) {
        if (key !== "ALL" && matchesOrderFilter(order, key)) counts[key] += 1;
      }
    }
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const matched = sorted.filter((order) => {
      if (!matchesOrderFilter(order, statusFilter)) return false;
      if (!q) return true;
      const { name } = getLocalizedProductFields(order.product, locale);
      return (
        order.customerName.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        order.phone.includes(q) ||
        order.city.toLowerCase().includes(q) ||
        (order.olivraisonTrackingId ?? "").toLowerCase().includes(q)
      );
    });
    return compact && !q && statusFilter === "ALL" ? matched.slice(0, 8) : matched;
  }, [orders, search, locale, compact, statusFilter]);

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

  function filterLabel(filter: OrderFilterKey) {
    const map: Record<OrderFilterKey, string> = {
      ALL: t("orderFilterAll"),
      PENDING: t("orderFilterPending"),
      CONFIRMED: t("orderFilterConfirmed"),
      READY_TO_SHIP: t("orderFilterReadyToShip"),
      SHIPPED: t("orderFilterShipped"),
      DELIVERED: t("orderFilterDelivered"),
      CANCELLED: t("orderFilterCancelled"),
      RETURNED: t("orderFilterReturned"),
    };
    return map[filter];
  }

  function shippingLabel(order: OrderWithProduct) {
    if (isOrderShipped(order)) return t("orderShippingSent");
    if (isShippingReady(order)) return t("orderShippingReady");
    return t("orderShippingNotReady");
  }

  function handleCopyPhone(orderId: string, phone: string) {
    copyText(phone);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyOrderForm(products));
    setRiskMessage(null);
    setModalOpen(true);
  }

  function openEdit(order: OrderWithProduct) {
    setEditingId(order.id);
    setForm(orderToForm(order, locale));
    setRiskMessage(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setRiskMessage(null);
  }

  async function saveOrder(id: string | null, payload: ReturnType<typeof buildPayload>) {
    const res = await fetch(id ? `/api/orders/${id}` : "/api/orders", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || t("orderSaveError"));
    }
    return res.json() as Promise<OrderWithProduct>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveOrder(editingId, buildPayload(form));
      closeModal();
      onChanged?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : t("orderSaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function onSendToOlivraison() {
    if (!editingId) return;
    setShipping(true);
    try {
      await saveOrder(editingId, buildPayload(form));
      const res = await fetch(`/api/orders/${editingId}/ship`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        trackingID?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || t("orderShipError"));
      }
      alert(t("orderShipSuccess", { tracking: data.trackingID ?? "" }));
      closeModal();
      onChanged?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : t("orderShipError"));
    } finally {
      setShipping(false);
    }
  }

  async function onQuickConfirm(order: OrderWithProduct) {
    setConfirmingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: order.customerName,
          phone: order.phone,
          city: order.city,
          productId: order.productId,
          quantity: order.quantity,
          totalPrice: Number(order.totalPrice),
          lineItems: order.lineItems,
          status: "CONFIRMED",
          statusNote: order.statusNote,
          streetAddress: order.streetAddress,
          shippingComment: order.shippingComment,
          shippingDescription: order.shippingDescription,
          shippingNoOpen: order.shippingNoOpen,
        }),
      });
      if (!res.ok) {
        alert(t("orderSaveError"));
        return;
      }
      onChanged?.();
    } finally {
      setConfirmingId(null);
    }
  }

  async function onCheckRisk() {
    if (!form.phone.trim()) return;
    setRiskBusy(true);
    setRiskMessage(null);
    try {
      const res = await fetch(
        `/api/admin/delivery?resource=blacklist&phone=${encodeURIComponent(form.phone.trim())}`,
      );
      const data = (await res.json()) as {
        blacklisted?: boolean;
        count?: number;
        deliveredCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || t("deliveryActionError"));
      setRiskMessage(
        data.blacklisted
          ? t("deliveryRisky", { count: data.count ?? 0 })
          : t("deliverySafe", { delivered: data.deliveredCount ?? 0 }),
      );
    } catch (error) {
      setRiskMessage(error instanceof Error ? error.message : t("deliveryActionError"));
    } finally {
      setRiskBusy(false);
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

      {!compact ? (
        <div className="delivery-filter-row mb-4">
          {FILTER_KEYS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={statusFilter === filter ? "delivery-filter-active" : ""}
              onClick={() => setStatusFilter(filter)}
            >
              {filterLabel(filter)}
              {filterCounts[filter] > 0 ? <span>{filterCounts[filter]}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon="receipt_long"
          title={search.trim() || statusFilter !== "ALL" ? t("noSearchResults") : t("noOrders")}
          description={search.trim() || statusFilter !== "ALL" ? undefined : t("noOrdersHint")}
        />
      ) : (
        <>
          <div className="admin-table-wrap hidden md:block">
            <table className="admin-table">
              <thead>
                <tr>
                  {!compact ? <th>{t("customer")}</th> : <th>{t("orderId")}</th>}
                  {!compact ? <th>{t("orderStatusLabel")}</th> : null}
                  {!compact ? <th>{t("orderShippingColumn")}</th> : null}
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
                      {!compact ? (
                        <td>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${orderStatusTone(order.status)}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </td>
                      ) : null}
                      {!compact ? (
                        <td className="text-xs text-on-surface-variant">
                          <div>{shippingLabel(order)}</div>
                          {order.olivraisonTrackingId ? (
                            <button
                              type="button"
                              className="admin-copy-link mt-1 font-mono"
                              onClick={() => handleCopyPhone(order.id, order.olivraisonTrackingId!)}
                            >
                              {order.olivraisonTrackingId}
                            </button>
                          ) : null}
                        </td>
                      ) : null}
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
                            {order.status === "PENDING" ? (
                              <button
                                type="button"
                                className="admin-icon-btn"
                                aria-label={t("orderConfirm")}
                                disabled={confirmingId === order.id}
                                onClick={() => void onQuickConfirm(order)}
                              >
                                <MaterialIcon name="check_circle" className="!text-lg" />
                              </button>
                            ) : null}
                            {canSendToOlivraison(order) ? (
                              <button
                                type="button"
                                className="admin-icon-btn"
                                aria-label={t("orderSendToOlivraison")}
                                onClick={() => openEdit(order)}
                              >
                                <MaterialIcon name="local_shipping" className="!text-lg" />
                              </button>
                            ) : null}
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
                      {!compact ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${orderStatusTone(order.status)}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                          <span className="admin-meta-pill">{shippingLabel(order)}</span>
                        </div>
                      ) : null}
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
                    {order.olivraisonTrackingId ? (
                      <span className="admin-meta-pill font-mono">{order.olivraisonTrackingId}</span>
                    ) : null}
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
                        {order.status === "PENDING" ? (
                          <button
                            type="button"
                            className="admin-btn-ghost"
                            disabled={confirmingId === order.id}
                            onClick={() => void onQuickConfirm(order)}
                          >
                            {t("orderConfirm")}
                          </button>
                        ) : null}
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
          shipping={shipping}
          olivraisonConfigured={olivraisonConfigured}
          olivraisonTrackingId={editingOrder?.olivraisonTrackingId ?? null}
          cities={cities}
          onClose={closeModal}
          onSubmit={(e) => void onSubmit(e)}
          onSendToOlivraison={() => void onSendToOlivraison()}
          onCheckRisk={() => void onCheckRisk()}
          riskMessage={riskMessage}
          riskBusy={riskBusy}
        />
      ) : null}
    </section>
  );
}
