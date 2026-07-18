"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import type {
  OlivraisonClaim,
  OlivraisonCreatePackage,
  OlivraisonDashboardData,
  OlivraisonPackage,
  OlivraisonPackageListItem,
} from "@/lib/olivraison-types";
import type { AppLocale } from "@/lib/product-i18n";
import { formatMad } from "@/lib/format-price";

type Tab = "packages" | "create" | "reference" | "claims";

const EMPTY_CREATE: OlivraisonCreatePackage = {
  price: 0,
  description: "",
  name: "",
  comment: "",
  orderId: "",
  noOpen: false,
  destination: { name: "", phone: "", city: "", streetAddress: "" },
};

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function statusTone(status: string) {
  if (status === "DELIVERED") return "bg-emerald-100 text-emerald-800";
  if (["CANCELED", "CANCELLED", "RETURNED", "DELETED"].includes(status)) return "bg-red-100 text-red-800";
  if (["TRANSIT", "PICKUP", "PICKEDUP", "RECIVED", "RECEIVED"].includes(status)) return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
}

export function AdminDeliveryView() {
  const t = useTranslations("admin");
  const locale = useLocale() as AppLocale;
  const [tab, setTab] = useState<Tab>("packages");
  const [data, setData] = useState<OlivraisonDashboardData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [citySearch, setCitySearch] = useState("");
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [pickupDriverEmail, setPickupDriverEmail] = useState("");
  const [riskByPhone, setRiskByPhone] = useState<
    Record<string, { count?: number; deliveredCount?: number; blacklisted?: boolean }>
  >({});
  const [detail, setDetail] = useState<OlivraisonPackage | null>(null);
  const [detailDraft, setDetailDraft] = useState({
    partnerTrackingID: "",
    comment: "",
    note: "",
    COD: "",
    name: "",
    streetAddress: "",
    city: "",
    phone: "",
  });
  const [createForm, setCreateForm] = useState<OlivraisonCreatePackage>(EMPTY_CREATE);
  const [blacklist, setBlacklist] = useState<{
    count?: number;
    deliveredCount?: number;
    blacklisted?: boolean;
  } | null>(null);
  const [claimForm, setClaimForm] = useState({
    subject: "",
    description: "",
    category: "DELIVERY",
    packageId: "",
    priority: "MEDIUM",
  });
  const [claimDetail, setClaimDetail] = useState<OlivraisonClaim | null>(null);
  const [claimComment, setClaimComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/delivery?resource=dashboard&page=${page}&limit=20`);
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      setData(await responseJson<OlivraisonDashboardData>(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryLoadError"));
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.packages ?? []).filter((item) =>
      (statusFilter === "ALL" || item.status === statusFilter) &&
      (!q ||
        [
          item.trackingID,
          item.partnerTrackingID,
          item.destination?.name,
          item.destination?.phone,
          item.destination?.city,
          item.status,
        ].some((value) => value?.toLowerCase().includes(q))),
    );
  }, [data?.packages, search, statusFilter]);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    return (data?.cities ?? [])
      .filter((city) => !q || city.name.toLowerCase().includes(q))
      .slice(0, 100);
  }, [data?.cities, citySearch]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of data?.packages ?? []) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [data?.packages]);
  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      CREATED: t("deliveryStatusCreated"),
      CONFIRMED: t("deliveryStatusConfirmed"),
      PICKUP: t("deliveryStatusPickup"),
      PICKEDUP: t("deliveryStatusPickedUp"),
      TRANSIT: t("deliveryStatusTransit"),
      REPORTED: t("deliveryStatusReported"),
      SCHEDULED: t("deliveryStatusScheduled"),
      RECIVED: t("deliveryStatusReceived"),
      RECEIVED: t("deliveryStatusReceived"),
      DELIVERED: t("deliveryStatusDelivered"),
      CANCELED: t("deliveryStatusCanceled"),
      CANCELLED: t("deliveryStatusCanceled"),
      RETURNED: t("deliveryStatusReturned"),
      INTERESTED: t("deliveryStatusInterested"),
    }),
    [t],
  );
  const visibleStatuses = useMemo(
    () =>
      Object.keys(statusCounts).sort((a, b) => {
        const order = [
          "CREATED",
          "CONFIRMED",
          "PICKUP",
          "PICKEDUP",
          "TRANSIT",
          "REPORTED",
          "SCHEDULED",
          "RECIVED",
          "DELIVERED",
          "RETURNED",
          "CANCELED",
        ];
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
      }),
    [statusCounts],
  );

  function displayStatus(status: string) {
    return (
      statusLabels[status] ||
      data?.statuses.find((item) => item.parcel_statut_code === status)
        ?.parcel_statut_label ||
      status.replaceAll("_", " ")
    );
  }

  const pageCod = useMemo(
    () => (data?.packages ?? []).reduce((total, item) => total + Number(item.COD || 0), 0),
    [data?.packages],
  );
  const selectedCity = useMemo(
    () =>
      data?.cities.find(
        (city) =>
          city.name.toLowerCase() === createForm.destination.city.trim().toLowerCase(),
      ),
    [createForm.destination.city, data?.cities],
  );

  async function action<T>(actionName: string, payload: Record<string, unknown>): Promise<T> {
    const response = await fetch("/api/admin/delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, payload }),
    });
    return responseJson<T>(response);
  }

  async function openPackage(item: OlivraisonPackageListItem) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/delivery?resource=package&trackingID=${encodeURIComponent(item.trackingID)}`,
      );
      const packageDetail = await responseJson<OlivraisonPackage>(response);
      setDetail(packageDetail);
      setDetailDraft({
        partnerTrackingID: packageDetail.partnerTrackingID ?? "",
        comment: packageDetail.comment ?? "",
        note: packageDetail.note ?? "",
        COD: String(packageDetail.COD ?? ""),
        name: packageDetail.destination?.name ?? "",
        streetAddress: packageDetail.destination?.streetAddress ?? "",
        city: packageDetail.destination?.city ?? "",
        phone: packageDetail.destination?.phone ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function createPackage(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await action("createPackage", createForm as unknown as Record<string, unknown>);
      setCreateForm(EMPTY_CREATE);
      setBlacklist(null);
      setTab("packages");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function updatePackage() {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      await action("updatePackage", {
        trackingID: detail.trackingID,
        updateObject: {
          comment: detailDraft.comment,
          note: detailDraft.note,
          COD: Number(detailDraft.COD),
          destination: {
            name: detailDraft.name,
            phone: detailDraft.phone,
            city: detailDraft.city,
            streetAddress: detailDraft.streetAddress,
          },
        },
      });
      setDetail(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function updatePartnerTracking() {
    if (!detail || !detailDraft.partnerTrackingID.trim()) return;
    setBusy(true);
    setError("");
    try {
      await action("updatePartnerTracking", {
        trackingID: detail.trackingID,
        partnerTrackingID: detailDraft.partnerTrackingID.trim(),
      });
      setDetail((current) =>
        current
          ? { ...current, partnerTrackingID: detailDraft.partnerTrackingID.trim() }
          : current,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmPackage(trackingID: string) {
    setBusy(true);
    setError("");
    try {
      await action("updateStatus", { trackingID, status: "CONFIRMED" });
      setDetail(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function cancelPackage(trackingID: string) {
    if (!window.confirm(t("deliveryCancelConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/delivery?trackingID=${encodeURIComponent(trackingID)}`,
        { method: "DELETE" },
      );
      await responseJson(response);
      setDetail(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function createPickup() {
    if (selectedIDs.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const result = await action<{
        miniStickerFilePath?: string;
        slipFilePath?: string;
      }>("createPickup", {
        packages: selectedIDs,
        ...(pickupDriverEmail.trim() ? { driverEmail: pickupDriverEmail.trim() } : {}),
      });
      setSelectedIDs([]);
      setPickupDriverEmail("");
      if (result.miniStickerFilePath) window.open(result.miniStickerFilePath, "_blank", "noopener");
      if (result.slipFilePath) window.open(result.slipFilePath, "_blank", "noopener");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function checkCurrentPageRisk() {
    const phones = [
      ...new Set(
        (data?.packages ?? [])
          .map((item) => item.destination?.phone?.trim())
          .filter((phone): phone is string => Boolean(phone)),
      ),
    ].slice(0, 100);
    if (phones.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const result = await action<{
        results?: Array<{
          phone?: string;
          count?: number;
          deliveredCount?: number;
          blacklisted?: boolean;
        }>;
      }>("checkBlacklistBulk", { phones });
      const next: typeof riskByPhone = {};
      for (const item of result.results ?? []) {
        if (item.phone) next[item.phone] = item;
      }
      setRiskByPhone(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function checkBlacklist() {
    const phone = createForm.destination.phone.trim();
    if (!phone) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/delivery?resource=blacklist&phone=${encodeURIComponent(phone)}`,
      );
      setBlacklist(await responseJson(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function createClaim(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await action("createClaim", claimForm);
      setClaimForm({
        subject: "",
        description: "",
        category: "DELIVERY",
        packageId: "",
        priority: "MEDIUM",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function openClaim(claim: OlivraisonClaim) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/delivery?resource=claim&id=${encodeURIComponent(claim._id)}`,
      );
      setClaimDetail(await responseJson<OlivraisonClaim>(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  async function addClaimComment(event: React.FormEvent) {
    event.preventDefault();
    if (!claimDetail || !claimComment.trim()) return;
    setBusy(true);
    setError("");
    try {
      const updated = await action<OlivraisonClaim>("addClaimComment", {
        claimID: claimDetail._id,
        content: claimComment.trim(),
      });
      setClaimDetail(updated);
      setClaimComment("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deliveryActionError"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <section className="admin-section flex min-h-64 items-center justify-center">
        <MaterialIcon name="progress_activity" className="!text-3xl animate-spin" />
      </section>
    );
  }

  if (data && !data.configured) {
    return (
      <section className="admin-section">
        <AdminEmptyState
          icon="local_shipping"
          title={t("deliveryNotConfigured")}
          description={t("deliveryConfigureHint")}
        />
        <div className="mx-auto mt-5 max-w-xl rounded-xl border border-outline-variant bg-surface-container p-4 font-mono text-sm">
          <p>OLIVRAISON_API_KEY=api-…</p>
          <p>OLIVRAISON_SECRET_KEY=…</p>
        </div>
      </section>
    );
  }

  return (
    <div className="delivery-dashboard space-y-5">
      {error ? (
        <div className="delivery-alert delivery-alert-error">
          <MaterialIcon name="error" className="!text-xl" />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label={t("cancel")}>
            <MaterialIcon name="close" className="!text-lg" />
          </button>
        </div>
      ) : null}

      <div className="delivery-connection">
        <span className="delivery-connection-dot" />
        <div>
          <strong>{t("deliveryConnected")}</strong>
          <p>{t("deliveryLiveData")}</p>
        </div>
        <button type="button" className="admin-btn-secondary ms-auto" disabled={loading} onClick={() => void load()}>
          <MaterialIcon name="sync" className={`!text-lg ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      <section className="delivery-kpi-grid">
        {[
          {
            label: t("deliveryTotal"),
            value: String(data?.pagination.total ?? 0),
            icon: "package_2",
            tone: "gold",
          },
          {
            label: t("deliveryReadyPickup"),
            value: String((statusCounts.CONFIRMED ?? 0) + (statusCounts.PICKUP ?? 0)),
            icon: "local_shipping",
            tone: "blue",
          },
          {
            label: t("deliveryInTransit"),
            value: String((statusCounts.TRANSIT ?? 0) + (statusCounts.RECIVED ?? 0)),
            icon: "route",
            tone: "purple",
          },
          {
            label: t("deliveryPageCod"),
            value: formatMad(String(pageCod), locale),
            icon: "payments",
            tone: "green",
          },
        ].map((item) => (
          <div key={item.label} className="delivery-kpi-card">
            <span className={`delivery-kpi-icon delivery-kpi-icon-${item.tone}`}>
              <MaterialIcon name={item.icon} className="!text-2xl" />
            </span>
            <div>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
            </div>
          </div>
        ))}
      </section>

      <div className="delivery-tabs">
        {([
          ["packages", "inventory_2"],
          ["create", "add_box"],
          ["reference", "map"],
          ["claims", "support_agent"],
        ] as Array<[Tab, string]>).map(([item, icon]) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "delivery-tab-active" : ""}
            onClick={() => setTab(item)}
          >
            <MaterialIcon name={icon} className="!text-lg" />
            {t(`deliveryTab${item[0].toUpperCase()}${item.slice(1)}`)}
          </button>
        ))}
      </div>

      {tab === "packages" ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2 className="admin-section-title">{t("deliveryPackages")}</h2>
              <p className="admin-section-subtitle">{t("deliveryPackagesHint")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={busy || !(data?.packages.length)}
                onClick={() => void checkCurrentPageRisk()}
              >
                <MaterialIcon name="shield" className="!text-lg" />
                {t("deliveryCheckPageRisk")}
              </button>
              <div className="admin-search-wrap">
                <MaterialIcon name="search" className="admin-search-icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="admin-search-input"
                  placeholder={t("deliverySearch")}
                />
              </div>
            </div>
          </div>

          <div className="delivery-filter-row">
            {["ALL", ...visibleStatuses]
              .map((status) => (
                <button
                  key={status}
                  type="button"
                  className={statusFilter === status ? "delivery-filter-active" : ""}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "ALL" ? t("deliveryAllStatuses") : displayStatus(status)}
                  {status !== "ALL" && statusCounts[status] ? (
                    <span>{statusCounts[status]}</span>
                  ) : null}
                </button>
              ))}
          </div>

          {selectedIDs.length > 0 ? (
            <div className="delivery-selection-bar">
              <div>
                <strong>{t("deliverySelected", { count: selectedIDs.length })}</strong>
                <p>{t("deliveryPickupHint")}</p>
              </div>
              <input
                type="email"
                value={pickupDriverEmail}
                onChange={(event) => setPickupDriverEmail(event.target.value)}
                placeholder={t("deliveryDriverEmail")}
              />
              <button
                type="button"
                className="admin-btn-primary"
                disabled={busy}
                onClick={() => void createPickup()}
              >
                <MaterialIcon name="local_shipping" className="!text-lg" />
                {t("deliveryCreatePickup")}
              </button>
            </div>
          ) : null}

          {filteredPackages.length === 0 ? (
            <AdminEmptyState
              icon="inventory_2"
              title={t("deliveryNoPackages")}
              description={t("deliveryNoPackagesHint")}
            />
          ) : (
            <>
            <div className="admin-table-wrap hidden md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th />
                    <th>{t("deliveryTracking")}</th>
                    <th>{t("customer")}</th>
                    <th>{t("city")}</th>
                    <th>{t("amount")}</th>
                    <th>{t("deliveryStatus")}</th>
                    <th>{t("date")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredPackages.map((item) => {
                    const canPickup = ["CONFIRMED", "PICKUP"].includes(item.status);
                    return (
                      <tr key={item.trackingID}>
                        <td>
                          <input
                            type="checkbox"
                            disabled={!canPickup}
                            checked={selectedIDs.includes(item.trackingID)}
                            onChange={(event) =>
                              setSelectedIDs((current) =>
                                event.target.checked
                                  ? [...current, item.trackingID]
                                  : current.filter((id) => id !== item.trackingID),
                              )
                            }
                          />
                        </td>
                        <td className="font-mono text-xs">{item.trackingID}</td>
                        <td>
                          <p className="font-medium">{item.destination?.name}</p>
                          <p className="text-xs text-on-surface-variant">
                            {item.destination?.phone}
                            {item.destination?.phone &&
                            riskByPhone[item.destination.phone]?.blacklisted ? (
                              <span className="delivery-risk-flag">{t("deliveryRiskFlag")}</span>
                            ) : null}
                          </p>
                        </td>
                        <td>{item.destination?.city}</td>
                        <td>{formatMad(String(item.COD ?? 0), locale)}</td>
                        <td>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                            {displayStatus(item.status)}
                          </span>
                        </td>
                        <td className="text-xs text-on-surface-variant">
                          {item.meta?.createAt
                            ? new Date(item.meta.createAt).toLocaleDateString(locale)
                            : "—"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => void openPackage(item)}
                            title={t("deliveryDetails")}
                          >
                            <MaterialIcon name="visibility" className="!text-lg" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="delivery-package-list md:hidden">
              {filteredPackages.map((item) => {
                const canPickup = ["CONFIRMED", "PICKUP"].includes(item.status);
                return (
                  <article key={item.trackingID} className="delivery-package-card">
                    <div className="delivery-package-card-head">
                      <label>
                        <input
                          type="checkbox"
                          disabled={!canPickup}
                          checked={selectedIDs.includes(item.trackingID)}
                          onChange={(event) =>
                            setSelectedIDs((current) =>
                              event.target.checked
                                ? [...current, item.trackingID]
                                : current.filter((id) => id !== item.trackingID),
                            )
                          }
                        />
                        <span className="font-mono">{item.trackingID}</span>
                      </label>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                        {displayStatus(item.status)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <strong>{item.destination?.name}</strong>
                        <p className="text-sm text-on-surface-variant">{item.destination?.phone}</p>
                      </div>
                      <strong className="brand-gold-text">{formatMad(String(item.COD ?? 0), locale)}</strong>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                      <span className="admin-meta-pill">
                        <MaterialIcon name="location_on" className="!text-sm" />
                        {item.destination?.city}
                      </span>
                      <button type="button" className="admin-btn-secondary" onClick={() => void openPackage(item)}>
                        {t("deliveryDetails")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            </>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              {t("deliveryPrevious")}
            </button>
            <span className="text-sm text-on-surface-variant">
              {page} / {Math.max(1, data?.pagination.pages ?? 1)}
            </span>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={page >= (data?.pagination.pages ?? 1) || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              {t("deliveryNext")}
            </button>
          </div>
        </section>
      ) : null}

      {tab === "create" ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2 className="admin-section-title">{t("deliveryCreatePackage")}</h2>
              <p className="admin-section-subtitle">{t("deliveryCreateHint")}</p>
            </div>
          </div>
          <form onSubmit={(event) => void createPackage(event)} className="grid gap-4 lg:grid-cols-2">
            <label className="admin-field">
              <span>{t("customer")}</span>
              <input
                required
                minLength={3}
                value={createForm.destination.name}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    destination: { ...form.destination, name: event.target.value },
                  }))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("phone")}</span>
              <div className="flex gap-2">
                <input
                  required
                  minLength={9}
                  maxLength={13}
                  value={createForm.destination.phone}
                  onChange={(event) => {
                    setBlacklist(null);
                    setCreateForm((form) => ({
                      ...form,
                      destination: { ...form.destination, phone: event.target.value },
                    }));
                  }}
                />
                <button type="button" className="admin-btn-secondary" onClick={() => void checkBlacklist()}>
                  {t("deliveryRiskCheck")}
                </button>
              </div>
              {blacklist ? (
                <small className={blacklist.blacklisted ? "text-red-700" : "text-emerald-700"}>
                  {blacklist.blacklisted
                    ? t("deliveryRisky", { count: blacklist.count ?? 0 })
                    : t("deliverySafe", { delivered: blacklist.deliveredCount ?? 0 })}
                </small>
              ) : null}
            </label>
            <label className="admin-field">
              <span>{t("city")}</span>
              <input
                required
                list="olivraison-cities"
                value={createForm.destination.city}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    destination: { ...form.destination, city: event.target.value },
                  }))
                }
              />
              <datalist id="olivraison-cities">
                {data?.cities.map((city) => <option key={city.name} value={city.name} />)}
              </datalist>
              {selectedCity ? (
                <small className="delivery-field-hint">
                  {t("deliveryEstimatedFee")}: {formatMad(String(selectedCity.price), locale)}
                </small>
              ) : null}
            </label>
            <label className="admin-field">
              <span>{t("deliveryAddress")}</span>
              <input
                required
                minLength={3}
                value={createForm.destination.streetAddress}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    destination: { ...form.destination, streetAddress: event.target.value },
                  }))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("amount")}</span>
              <input
                required
                min={0}
                step="0.01"
                type="number"
                value={createForm.price || ""}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, price: Number(event.target.value) }))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("deliveryPackageName")}</span>
              <input
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, name: event.target.value }))
                }
              />
            </label>
            <label className="admin-field lg:col-span-2">
              <span>{t("deliveryDescription")}</span>
              <input
                required
                minLength={3}
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, description: event.target.value }))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("orderId")}</span>
              <input
                value={createForm.orderId}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, orderId: event.target.value }))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("deliveryComment")}</span>
              <input
                value={createForm.comment}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, comment: event.target.value }))
                }
              />
            </label>
            <div className="delivery-options lg:col-span-2">
              <label>
                <input
                  type="checkbox"
                  checked={createForm.noOpen}
                  onChange={(event) =>
                    setCreateForm((form) => ({ ...form, noOpen: event.target.checked }))
                  }
                />
                <span>
                  <strong>{t("deliveryNoOpen")}</strong>
                  <small>{t("deliveryNoOpenHint")}</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={createForm.exchange}
                  onChange={(event) =>
                    setCreateForm((form) => ({
                      ...form,
                      exchange: event.target.checked,
                      exchangePackage: event.target.checked ? form.exchangePackage : "",
                    }))
                  }
                />
                <span>
                  <strong>{t("deliveryExchange")}</strong>
                  <small>{t("deliveryExchangeHint")}</small>
                </span>
              </label>
            </div>
            {createForm.exchange ? (
              <label className="admin-field lg:col-span-2">
                <span>{t("deliveryOriginalTracking")}</span>
                <input
                  required
                  value={createForm.exchangePackage ?? ""}
                  onChange={(event) =>
                    setCreateForm((form) => ({
                      ...form,
                      exchangePackage: event.target.value,
                    }))
                  }
                />
              </label>
            ) : null}
            <div className="lg:col-span-2">
              <button type="submit" className="admin-btn-primary" disabled={busy}>
                {busy ? t("creating") : t("deliveryCreatePackage")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "reference" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="admin-section">
            <div className="admin-section-head">
              <div>
                <h2 className="admin-section-title">{t("deliveryCities")}</h2>
                <p className="admin-section-subtitle">{t("deliveryCitiesHint")}</p>
              </div>
              <input
                className="admin-search-input"
                value={citySearch}
                onChange={(event) => setCitySearch(event.target.value)}
                placeholder={t("deliverySearchCities")}
              />
            </div>
            <div className="max-h-[520px] overflow-auto">
              {filteredCities.map((city) => (
                <div key={city.name} className="flex justify-between border-b border-outline-variant py-2 text-sm">
                  <span>{city.name}</span>
                  <strong>{formatMad(String(city.price), locale)}</strong>
                </div>
              ))}
            </div>
          </section>
          <div className="space-y-5">
            <section className="admin-section">
              <h2 className="admin-section-title">{t("deliveryStatuses")}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {data?.statuses.map((status) => (
                  <span key={status.parcel_statut_code} className="admin-meta-pill">
                    <strong>{status.parcel_statut_code}</strong>
                    {status.parcel_statut_label}
                  </span>
                ))}
              </div>
            </section>
            <section className="admin-section">
              <h2 className="admin-section-title">{t("deliveryInventory")}</h2>
              <div className="mt-4 space-y-2">
                {data?.products.length ? data.products.map((product) => (
                  <div key={product._id} className="flex justify-between border-b border-outline-variant py-2 text-sm">
                    <span>{product.name}</span>
                    <span>{product.quantity ?? 0} · {product.reference || "—"}</span>
                  </div>
                )) : <p className="text-sm text-on-surface-variant">{t("deliveryNoInventory")}</p>}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {tab === "claims" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="admin-section">
            <h2 className="admin-section-title">{t("deliveryClaims")}</h2>
            <div className="mt-4 space-y-3">
              {data?.claims.length ? data.claims.map((claim: OlivraisonClaim) => (
                <article key={claim._id} className="rounded-xl border border-outline-variant p-3">
                  <div className="flex items-start justify-between gap-3">
                    <strong>{claim.subject}</strong>
                    <span className="admin-meta-pill">{claim.status || "OPEN"}</span>
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">{claim.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs">{claim.reference || claim.category}</p>
                    <button type="button" className="admin-btn-secondary" onClick={() => void openClaim(claim)}>
                      {t("deliveryViewClaim")}
                    </button>
                  </div>
                </article>
              )) : <AdminEmptyState icon="support_agent" title={t("deliveryNoClaims")} />}
            </div>
          </section>
          <section className="admin-section">
            <h2 className="admin-section-title">{t("deliveryCreateClaim")}</h2>
            <form onSubmit={(event) => void createClaim(event)} className="mt-4 space-y-4">
              <label className="admin-field">
                <span>{t("deliveryClaimSubject")}</span>
                <input required value={claimForm.subject} onChange={(event) => setClaimForm((form) => ({ ...form, subject: event.target.value }))} />
              </label>
              <label className="admin-field">
                <span>{t("deliveryClaimDescription")}</span>
                <textarea required rows={5} value={claimForm.description} onChange={(event) => setClaimForm((form) => ({ ...form, description: event.target.value }))} />
              </label>
              <label className="admin-field">
                <span>{t("deliveryTracking")}</span>
                <input value={claimForm.packageId} onChange={(event) => setClaimForm((form) => ({ ...form, packageId: event.target.value }))} />
              </label>
              <button type="submit" className="admin-btn-primary" disabled={busy}>
                {t("deliverySubmitClaim")}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {detail ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal max-w-3xl">
            <div className="admin-modal-header">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs text-on-surface-variant">{detail.trackingID}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(detail.status)}`}>
                    {displayStatus(detail.status)}
                  </span>
                </div>
                <h2 className="mt-2 font-headline text-2xl">{t("deliveryDetails")}</h2>
              </div>
              <button type="button" className="admin-icon-btn" onClick={() => setDetail(null)}>
                <MaterialIcon name="close" />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="delivery-detail-stats">
                <div>
                  <MaterialIcon name="warehouse" />
                  <span>{t("deliveryWarehouse")}</span>
                  <strong>{detail.warehouse || "—"}</strong>
                </div>
                <div>
                  <MaterialIcon name="person_pin" />
                  <span>{t("deliveryDriver")}</span>
                  <strong>{detail.transport?.currentDriverName || "—"}</strong>
                  {detail.transport?.currentDriverPhone ? (
                    <small>{detail.transport.currentDriverPhone}</small>
                  ) : null}
                </div>
                <div>
                  <MaterialIcon name="receipt_long" />
                  <span>{t("deliveryFees")}</span>
                  <strong>{formatMad(String(detail.deliveryFees ?? 0), locale)}</strong>
                </div>
              </div>

              <section className="delivery-detail-section">
                <h3>{t("deliveryPartnerReference")}</h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="flex-1"
                    value={detailDraft.partnerTrackingID}
                    onChange={(event) =>
                      setDetailDraft((draft) => ({
                        ...draft,
                        partnerTrackingID: event.target.value,
                      }))
                    }
                    placeholder={t("deliveryPartnerReferenceHint")}
                  />
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={busy || !detailDraft.partnerTrackingID.trim()}
                    onClick={() => void updatePartnerTracking()}
                  >
                    {t("saveChanges")}
                  </button>
                </div>
              </section>

              <section className="delivery-detail-section">
                <h3>{t("deliveryRecipient")}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {(["name", "phone", "city", "streetAddress"] as const).map((field) => (
                    <label key={field} className="admin-field">
                      <span>{field === "streetAddress" ? t("deliveryAddress") : t(field === "name" ? "customer" : field)}</span>
                      <input value={detailDraft[field]} onChange={(event) => setDetailDraft((draft) => ({ ...draft, [field]: event.target.value }))} />
                    </label>
                  ))}
                  <label className="admin-field">
                    <span>{t("amount")}</span>
                    <input type="number" value={detailDraft.COD} onChange={(event) => setDetailDraft((draft) => ({ ...draft, COD: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>{t("deliveryComment")}</span>
                    <input value={detailDraft.comment} onChange={(event) => setDetailDraft((draft) => ({ ...draft, comment: event.target.value }))} />
                  </label>
                  <label className="admin-field md:col-span-2">
                    <span>{t("deliveryNote")}</span>
                    <input value={detailDraft.note} onChange={(event) => setDetailDraft((draft) => ({ ...draft, note: event.target.value }))} />
                  </label>
                </div>
              </section>

              <section className="delivery-detail-section">
                <h3>{t("deliveryHistory")}</h3>
                <div className="delivery-timeline">
                  {detail.history?.length ? detail.history.map((entry, index) => (
                    <div key={`${entry.updateAt}-${index}`}>
                      <span className="delivery-timeline-dot" />
                      <div>
                        <strong>{entry.status}</strong>
                        <p>{entry.msg || "—"}</p>
                        <small>
                          {entry.updateAt ? new Date(entry.updateAt).toLocaleString(locale) : ""}
                        </small>
                      </div>
                    </div>
                  )) : <p className="text-sm text-on-surface-variant">{t("deliveryNoHistory")}</p>}
                </div>
              </section>
            </div>
            <div className="admin-modal-footer justify-end">
              <button type="button" className="admin-btn-secondary" onClick={() => setDetail(null)}>
                {t("cancel")}
              </button>
              {detail.status === "CREATED" ? (
                <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void confirmPackage(detail.trackingID)}>
                  {t("deliveryConfirm")}
                </button>
              ) : null}
              {detail.status === "CONFIRMED" ? (
                <button type="button" className="admin-btn-danger" disabled={busy} onClick={() => void cancelPackage(detail.trackingID)}>
                  {t("deliveryCancelPackage")}
                </button>
              ) : null}
              {!["ARCHIVED", "DELETED", "DELIVERED", "RETURNED", "CANCELED"].includes(detail.status) ? (
                <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void updatePackage()}>
                  {t("saveChanges")}
                </button>
              ) : null}
              </div>
          </div>
        </div>
      ) : null}

      {claimDetail ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <div className="flex items-center gap-2">
                  <span className="admin-meta-pill">{claimDetail.status || "OPEN"}</span>
                  <span className="text-xs text-on-surface-variant">
                    {claimDetail.priority || "MEDIUM"}
                  </span>
                </div>
                <h2 className="mt-2 font-headline text-2xl">{claimDetail.subject}</h2>
              </div>
              <button type="button" className="admin-icon-btn" onClick={() => setClaimDetail(null)}>
                <MaterialIcon name="close" />
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="text-sm leading-6 text-on-surface-variant">
                {claimDetail.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="admin-meta-pill">{claimDetail.category}</span>
                {claimDetail.reference ? (
                  <span className="admin-meta-pill">{claimDetail.reference}</span>
                ) : null}
              </div>

              <section className="delivery-detail-section">
                <h3>{t("deliveryClaimConversation")}</h3>
                <div className="space-y-3">
                  {claimDetail.comments?.length ? (
                    claimDetail.comments.map((comment, index) => (
                      <article key={`${comment.createdAt}-${index}`} className="delivery-claim-comment">
                        <p>{comment.content}</p>
                        <small>
                          {comment.user ? `${comment.user} · ` : ""}
                          {comment.createdAt
                            ? new Date(comment.createdAt).toLocaleString(locale)
                            : ""}
                        </small>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-on-surface-variant">{t("deliveryNoClaimComments")}</p>
                  )}
                </div>
              </section>

              <form onSubmit={(event) => void addClaimComment(event)} className="delivery-detail-section">
                <h3>{t("deliveryAddComment")}</h3>
                <textarea
                  rows={4}
                  required
                  value={claimComment}
                  onChange={(event) => setClaimComment(event.target.value)}
                  placeholder={t("deliveryCommentPlaceholder")}
                />
                <button type="submit" className="admin-btn-primary mt-3" disabled={busy}>
                  {t("deliverySendComment")}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
