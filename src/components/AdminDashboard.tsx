"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminKpiCard, AdminDeltaBadge } from "@/components/admin/AdminKpiCard";
import { AdminLoadingState } from "@/components/admin/AdminLoadingState";
import { AdminOrdersView } from "@/components/admin/AdminOrdersView";
import { AdminProductsView } from "@/components/admin/AdminProductsView";
import { AdminProductModal } from "@/components/admin/AdminProductModal";
import { AdminCategoriesView, type CategoryForm } from "@/components/admin/AdminCategoriesView";
import { AdminHomeView } from "@/components/admin/AdminHomeView";
import { AdminDeliveryView } from "@/components/admin/AdminDeliveryView";
import { draftsFromProductVariants, draftsToPayload } from "@/components/admin/AdminColorVariantPicker";
import {
  EMPTY_PRODUCT_FORM,
  type AdminView,
  type OrderWithProduct,
} from "@/components/admin/types";
import type { ProductForClient } from "@/lib/product-serialize";
import type { CategoryForClient } from "@/lib/category-serialize";
import type { HomeSectionContent, HomeSectionForClient, HomeSectionKey } from "@/lib/home-content-types";
import { formatMad } from "@/lib/format-price";
import type { AppLocale } from "@/lib/product-i18n";

function dayKey(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function ordersInDayOffsets(orders: OrderWithProduct[], fromDaysAgo: number, toDaysAgo: number) {
  const keys = new Set<string>();
  for (let i = fromDaysAgo; i >= toDaysAgo; i--) keys.add(dayKey(i));
  return orders.filter((o) => keys.has(o.createdAt.slice(0, 10)));
}

function pctDelta(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / prev) * 100;
}

export function AdminDashboard({ view }: { view: AdminView }) {
  const t = useTranslations("admin");
  const brand = useTranslations("brand");
  const locale = useLocale() as AppLocale;

  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [products, setProducts] = useState<ProductForClient[]>([]);
  const [categories, setCategories] = useState<CategoryForClient[]>([]);
  const [homeSections, setHomeSections] = useState<HomeSectionForClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT_FORM });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingHome, setSavingHome] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<7 | 30>(7);
  const [imageUploadBusy, setImageUploadBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [o, p, c, h] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/home-sections"),
      ]);
      if (o.status === 401 || p.status === 401 || c.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (o.ok) setOrders(await o.json());
      if (p.ok) setProducts(await p.json());
      if (c.ok) setCategories(await c.json());
      if (h.ok) setHomeSections(await h.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function closeProductModal() {
    setEditingProductId(null);
    setShowCreateForm(false);
    setForm({ ...EMPTY_PRODUCT_FORM });
  }

  function openCreateModal() {
    setEditingProductId(null);
    setForm({ ...EMPTY_PRODUCT_FORM });
    setShowCreateForm(true);
  }

  function beginEditProduct(product: ProductForClient) {
    const offer2 = product.bundleOffers.find((o) => o.quantity === 2);
    const offer3 = product.bundleOffers.find((o) => o.quantity === 3);
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      nameAr: product.nameAr ?? "",
      nameFr: product.nameFr ?? "",
      price: product.price,
      priceFor2: offer2 ? String(offer2.price) : "",
      priceFor3: offer3 ? String(offer3.price) : "",
      description: product.description,
      descriptionAr: product.descriptionAr ?? "",
      descriptionFr: product.descriptionFr ?? "",
      categories: [...product.categories],
      imageUrls: [...product.images],
      colorVariants: draftsFromProductVariants(product.colorVariants),
    });
    setShowCreateForm(true);
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const colorVariants = draftsToPayload(form.colorVariants);

      const payload = {
        name: form.name,
        nameAr: form.nameAr || undefined,
        nameFr: form.nameFr || undefined,
        price: Number(form.price),
        priceFor2: form.priceFor2 ? Number(form.priceFor2) : undefined,
        priceFor3: form.priceFor3 ? Number(form.priceFor3) : undefined,
        description: form.description,
        descriptionAr: form.descriptionAr || undefined,
        descriptionFr: form.descriptionFr || undefined,
        categories: form.categories,
        images: form.imageUrls,
        colorVariants,
      };

      const res = editingProductId
        ? await fetch(`/api/products/${editingProductId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        closeProductModal();
        await load(true);
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteProduct(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) await load(true);
    } finally {
      setDeletingId(null);
    }
  }

  function categoryPayload(form: CategoryForm) {
    return {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || null,
      nameFr: form.nameFr.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
    };
  }

  async function createCategory(form: CategoryForm) {
    setSavingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryPayload(form)),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || t("categorySaveError"));
      await load(true);
    } finally {
      setSavingCategory(false);
    }
  }

  async function updateCategory(id: string, form: CategoryForm) {
    setSavingCategory(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryPayload(form)),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || t("categorySaveError"));
      await load(true);
    } finally {
      setSavingCategory(false);
    }
  }

  async function deleteCategory(id: string) {
    setDeletingCategoryId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string; productCount?: number };
      if (!res.ok) {
        if (body.productCount) throw new Error(t("categoryDeleteInUse", { count: body.productCount }));
        throw new Error(body.error || t("categoryDeleteError"));
      }
      await load(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("categoryDeleteError"));
    } finally {
      setDeletingCategoryId(null);
    }
  }

  async function saveHomeSection(
    key: HomeSectionKey,
    payload: { enabled: boolean; content: HomeSectionContent },
  ) {
    setSavingHome(true);
    try {
      const res = await fetch(`/api/home-sections/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || t("homeSaveError"));
      await load(true);
    } finally {
      setSavingHome(false);
    }
  }

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) counts[cat.name] = 0;
    for (const product of products) {
      for (const name of product.categories) {
        counts[name] = (counts[name] ?? 0) + 1;
      }
    }
    return counts;
  }, [categories, products]);

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + Number(o.totalPrice), 0), [orders]);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;

  const chartData = useMemo(() => {
    const rows: { label: string; orders: number; revenue: number }[] = [];
    for (let k = chartRange - 1; k >= 0; k--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - k);
      const key = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter((o) => o.createdAt.slice(0, 10) === key);
      rows.push({
        label:
          chartRange <= 14
            ? d.toLocaleDateString(locale, { weekday: "short" })
            : d.toLocaleDateString(locale, { month: "short", day: "numeric" }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + Number(o.totalPrice), 0),
      });
    }
    return rows;
  }, [orders, chartRange, locale]);

  const orderDeltaPct = useMemo(() => {
    const cur = ordersInDayOffsets(orders, chartRange - 1, 0).length;
    const prev = ordersInDayOffsets(orders, chartRange * 2 - 1, chartRange).length;
    return pctDelta(cur, prev);
  }, [orders, chartRange]);

  const revenueDeltaPct = useMemo(() => {
    const sum = (list: OrderWithProduct[]) => list.reduce((s, o) => s + Number(o.totalPrice), 0);
    return pctDelta(
      sum(ordersInDayOffsets(orders, chartRange - 1, 0)),
      sum(ordersInDayOffsets(orders, chartRange * 2 - 1, chartRange)),
    );
  }, [orders, chartRange]);

  const newProducts30d = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return products.filter((p) => new Date(p.createdAt).getTime() >= cutoff).length;
  }, [products]);

  const greetingKey = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "goodMorning" as const;
    if (h < 18) return "goodAfternoon" as const;
    return "goodEvening" as const;
  }, []);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" }),
    [locale],
  );

  if (loading) return <AdminLoadingState />;

  const header =
    view === "overview" ? (
      <div>
        <p className="brand-eyebrow">{todayLabel}</p>
        <h1 className="admin-page-title">
          {greetingKey === "goodMorning" ? t("goodMorning") : greetingKey === "goodAfternoon" ? t("goodAfternoon") : t("goodEvening")}
          , <span className="italic brand-gold-text">{brand("name")}</span>
        </h1>
        <p className="admin-page-subtitle">{t("dashIntro")}</p>
      </div>
    ) : view === "categories" ? (
      <div>
        <p className="brand-eyebrow">{t("navCategories")}</p>
        <h1 className="admin-page-title">{t("navCategories")}</h1>
        <p className="admin-page-subtitle">{t("categoriesIntro")}</p>
      </div>
    ) : view === "home" ? (
      <div>
        <p className="brand-eyebrow">{t("navHome")}</p>
        <h1 className="admin-page-title">{t("navHome")}</h1>
        <p className="admin-page-subtitle">{t("homeIntro")}</p>
      </div>
    ) : view === "delivery" ? (
      <div>
        <p className="brand-eyebrow">Olivraison</p>
        <h1 className="admin-page-title">{t("navDelivery")}</h1>
        <p className="admin-page-subtitle">{t("deliveryIntro")}</p>
      </div>
    ) : (
      <div>
        <p className="brand-eyebrow">{view === "orders" ? t("navOrders") : t("navProducts")}</p>
        <h1 className="admin-page-title">{view === "orders" ? t("orders") : t("products")}</h1>
        <p className="admin-page-subtitle">{t("subtitle")}</p>
      </div>
    );

  return (
    <AdminShell
      view={view}
      orderCount={orders.length}
      header={header}
      onRefresh={() => void load(true)}
      refreshing={refreshing}
    >
      {view === "overview" && (
        <>
          <section className="admin-kpi-grid">
            <AdminKpiCard
              label={t("kpiOrders")}
              icon="receipt_long"
              value={orders.length}
              hint={<AdminDeltaBadge value={orderDeltaPct} suffix={t("changeVsPrev")} />}
            />
            <AdminKpiCard
              label={t("kpiProducts")}
              icon="inventory_2"
              accent="dark"
              value={products.length}
              hint={<span className="text-xs text-on-surface-variant">{t("newProductsCaption", { count: newProducts30d })}</span>}
            />
            <AdminKpiCard
              label={t("kpiRevenue")}
              icon="payments"
              value={formatMad(totalRevenue.toFixed(2), locale)}
              hint={<AdminDeltaBadge value={revenueDeltaPct} suffix={t("changeVsPrev")} />}
            />
            <AdminKpiCard
              label={t("kpiAvgOrder")}
              icon="show_chart"
              accent="green"
              value={formatMad(avgOrder.toFixed(2), locale)}
              hint={<span className="text-xs text-on-surface-variant">{t("avgOrderHint")}</span>}
            />
          </section>

          <section className="admin-section admin-chart-section">
            <div className="admin-section-head">
              <div>
                <h2 className="admin-section-title">{t("salesOverview")}</h2>
                <p className="admin-section-subtitle">{t("chartOrders")} · {t("chartRevenue")}</p>
              </div>
              <div className="admin-segmented">
                <button type="button" className={chartRange === 7 ? "admin-segmented-active" : ""} onClick={() => setChartRange(7)}>{t("range7d")}</button>
                <button type="button" className={chartRange === 30 ? "admin-segmented-active" : ""} onClick={() => setChartRange(30)}>{t("range30d")}</button>
              </div>
            </div>
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminRevFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#000000" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#000000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#000000" strokeOpacity={0.12} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#000000", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev" tick={{ fill: "#000000", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                  <YAxis yAxisId="ord" orientation="right" tick={{ fill: "#000000", fontSize: 11 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #000000", fontSize: "12px" }}
                    formatter={(value, name) => {
                      const n = value == null ? 0 : typeof value === "number" ? value : Number(value);
                      if (name === "revenue") return [formatMad((Number.isFinite(n) ? n : 0).toFixed(2), locale), t("chartRevenue")];
                      return [Number.isFinite(n) ? n : 0, t("chartOrders")];
                    }}
                  />
                  <Bar yAxisId="ord" dataKey="orders" fill="#000000" radius={[6, 6, 0, 0]} maxBarSize={28} opacity={0.85} />
                  <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#000000" strokeWidth={2} fill="url(#adminRevFill)" dot={false} activeDot={{ r: 4, fill: "#000000" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <AdminOrdersView orders={orders} compact />
        </>
      )}

      {view === "orders" && <AdminOrdersView orders={orders} />}

      {view === "products" && (
        <>
          <AdminProductsView
            products={products}
            deletingId={deletingId}
            onEdit={beginEditProduct}
            onDelete={(id) => void deleteProduct(id)}
            onAdd={openCreateModal}
          />
          <AdminProductModal
            open={showCreateForm}
            editingId={editingProductId}
            form={form}
            setForm={setForm}
            creating={creating}
            imageUploadBusy={imageUploadBusy}
            onBusyChange={setImageUploadBusy}
            onClose={closeProductModal}
            onSubmit={(e) => void saveProduct(e)}
            categories={categories}
          />
        </>
      )}

      {view === "categories" && (
        <AdminCategoriesView
          categories={categories}
          productCounts={categoryProductCounts}
          saving={savingCategory}
          deletingId={deletingCategoryId}
          onCreate={createCategory}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
        />
      )}

      {view === "home" && (
        <AdminHomeView
          sections={homeSections}
          saving={savingHome}
          onSave={saveHomeSection}
        />
      )}

      {view === "delivery" && <AdminDeliveryView />}
    </AdminShell>
  );
}
