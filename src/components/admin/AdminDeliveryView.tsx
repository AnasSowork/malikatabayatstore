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
  if (["CANCELED", "RETURNED", "DELETED"].includes(status)) return "bg-red-100 text-red-800";
  if (["TRANSIT", "PICKUP", "RECIVED"].includes(status)) return "bg-blue-100 text-blue-800";
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
  const [citySearch, setCitySearch] = useState("");
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [detail, setDetail] = useState<OlivraisonPackage | null>(null);
  const [detailDraft, setDetailDraft] = useState({
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
    if (!q) return data?.packages ?? [];
    return (data?.packages ?? []).filter((item) =>
      [
        item.trackingID,
        item.partnerTrackingID,
        item.destination?.name,
        item.destination?.phone,
        item.destination?.city,
        item.status,
      ].some((value) => value?.toLowerCase().includes(q)),
    );
  }, [data?.packages, search]);

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
      }>("createPickup", { packages: selectedIDs });
      setSelectedIDs([]);
      if (result.miniStickerFilePath) window.open(result.miniStickerFilePath, "_blank", "noopener");
      if (result.slipFilePath) window.open(result.slipFilePath, "_blank", "noopener");
      await load();
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
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="admin-section !p-4">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">{t("deliveryTotal")}</p>
          <p className="mt-1 font-headline text-3xl">{data?.pagination.total ?? 0}</p>
        </div>
        {["CREATED", "CONFIRMED", "TRANSIT"].map((status) => (
          <div key={status} className="admin-section !p-4">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant">{status}</p>
            <p className="mt-1 font-headline text-3xl">{statusCounts[status] ?? 0}</p>
          </div>
        ))}
      </section>

      <div className="admin-segmented flex-wrap">
        {(["packages", "create", "reference", "claims"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "admin-segmented-active" : ""}
            onClick={() => setTab(item)}
          >
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
              {selectedIDs.length > 0 ? (
                <button
                  type="button"
                  className="admin-btn-primary"
                  disabled={busy}
                  onClick={() => void createPickup()}
                >
                  <MaterialIcon name="local_shipping" className="!text-lg" />
                  {t("deliveryCreatePickup")} ({selectedIDs.length})
                </button>
              ) : null}
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

          {filteredPackages.length === 0 ? (
            <AdminEmptyState
              icon="inventory_2"
              title={t("deliveryNoPackages")}
              description={t("deliveryNoPackagesHint")}
            />
          ) : (
            <div className="admin-table-wrap">
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
                          <p className="text-xs text-on-surface-variant">{item.destination?.phone}</p>
                        </td>
                        <td>{item.destination?.city}</td>
                        <td>{formatMad(String(item.COD ?? 0), locale)}</td>
                        <td>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                            {item.status}
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
            <label className="flex items-center gap-2 text-sm lg:col-span-2">
              <input
                type="checkbox"
                checked={createForm.noOpen}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, noOpen: event.target.checked }))
                }
              />
              {t("deliveryNoOpen")}
            </label>
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
                  <p className="mt-2 text-xs">{claim.reference || claim.category}</p>
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
            <div className="admin-section-head">
              <div>
                <p className="brand-eyebrow">{detail.trackingID}</p>
                <h2 className="admin-section-title">{t("deliveryDetails")}</h2>
              </div>
              <button type="button" className="admin-icon-btn" onClick={() => setDetail(null)}>
                <MaterialIcon name="close" />
              </button>
            </div>
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
            <div className="mt-5">
              <h3 className="font-semibold">{t("deliveryHistory")}</h3>
              <div className="mt-2 max-h-40 overflow-auto">
                {detail.history?.map((entry, index) => (
                  <div key={`${entry.updateAt}-${index}`} className="flex gap-3 border-b border-outline-variant py-2 text-xs">
                    <strong>{entry.status}</strong>
                    <span>{entry.msg}</span>
                    <span className="ms-auto text-on-surface-variant">
                      {entry.updateAt ? new Date(entry.updateAt).toLocaleString(locale) : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {detail.status === "CREATED" ? (
                <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void confirmPackage(detail.trackingID)}>
                  {t("deliveryConfirm")}
                </button>
              ) : null}
              {detail.status === "CONFIRMED" ? (
                <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void cancelPackage(detail.trackingID)}>
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
    </div>
  );
}
