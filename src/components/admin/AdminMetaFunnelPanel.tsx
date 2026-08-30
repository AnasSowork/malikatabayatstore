"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";

type DiagnosticsTotals = {
  orders: number;
  purchaseSent: number;
  purchaseFailed: number;
  purchaseSkipped: number;
  purchaseMissing: number;
  purchasePending: number;
  backfillCandidates: number;
};

type DiagnosticsPayload = {
  ok: boolean;
  metaCapiConfigured: boolean;
  diagnostics: {
    totals: DiagnosticsTotals;
    attribution: {
      withFbp: number;
      withFbc: number;
      withUtm: number;
      withNeither: number;
    };
    candidates: Array<{
      orderId: string;
      createdAt: string;
      customerName: string;
      reason: string;
      metaFbp: boolean;
      metaFbc: boolean;
    }>;
  };
};

type Props = {
  onChanged?: () => void;
};

export function AdminMetaFunnelPanel({ onChanged }: Props) {
  const t = useTranslations("admin");
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/meta-events/diagnostics?limit=20");
      const json = (await res.json()) as DiagnosticsPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? t("metaFunnelLoadError"));
        return;
      }
      setData(json);
    } catch {
      setError(t("metaFunnelLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runBackfill(dryRun: boolean) {
    setBackfilling(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/meta-events/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, limit: 50 }),
      });
      const json = (await res.json()) as {
        error?: string;
        dryRun?: boolean;
        wouldProcess?: number;
        batch?: { sent: number; failed: number; processed: number };
        diagnostics?: DiagnosticsTotals;
      };
      if (!res.ok) {
        setError(json.error ?? t("metaFunnelBackfillError"));
        return;
      }
      if (json.dryRun) {
        setMessage(t("metaFunnelDryRunResult", { count: json.wouldProcess ?? 0 }));
      } else {
        const batch = json.batch;
        setMessage(
          t("metaFunnelBackfillResult", {
            sent: batch?.sent ?? 0,
            failed: batch?.failed ?? 0,
            processed: batch?.processed ?? 0,
          }),
        );
        onChanged?.();
        await load();
      }
    } catch {
      setError(t("metaFunnelBackfillError"));
    } finally {
      setBackfilling(false);
    }
  }

  const totals = data?.diagnostics.totals;
  const attribution = data?.diagnostics.attribution;
  const candidates = data?.diagnostics.candidates ?? [];

  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MaterialIcon name="insights" className="brand-gold-text !text-xl" />
          <h2 className="text-base font-semibold text-on-surface">{t("metaFunnelTitle")}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="admin-btn-ghost text-sm"
            disabled={loading || backfilling}
            onClick={() => void load()}
          >
            {t("metaFunnelRefresh")}
          </button>
          <button
            type="button"
            className="admin-btn-secondary text-sm"
            disabled={loading || backfilling || !totals?.backfillCandidates}
            onClick={() => void runBackfill(true)}
          >
            {t("metaFunnelPreview")}
          </button>
          <button
            type="button"
            className="admin-btn-primary text-sm"
            disabled={
              loading ||
              backfilling ||
              !data?.metaCapiConfigured ||
              !totals?.backfillCandidates
            }
            onClick={() => void runBackfill(false)}
          >
            {backfilling ? t("metaFunnelBackfilling") : t("metaFunnelBackfill")}
          </button>
        </div>
      </div>

      {!data?.metaCapiConfigured ? (
        <p className="mb-2 text-sm text-amber-700">{t("metaFunnelNotConfigured")}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-on-surface-variant">{t("metaFunnelLoading")}</p>
      ) : totals ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("metaFunnelOrders")} value={totals.orders} />
          <Stat label={t("metaFunnelSent")} value={totals.purchaseSent} tone="ok" />
          <Stat label={t("metaFunnelFailed")} value={totals.purchaseFailed} tone="bad" />
          <Stat
            label={t("metaFunnelMissing")}
            value={totals.purchaseMissing + totals.purchaseSkipped + totals.purchasePending}
            tone="warn"
          />
        </div>
      ) : null}

      {attribution ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          {t("metaFunnelAttribution", {
            fbp: attribution.withFbp,
            fbc: attribution.withFbc,
            utm: attribution.withUtm,
            neither: attribution.withNeither,
          })}
        </p>
      ) : null}

      {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      {candidates.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {t("metaFunnelCandidates")}
          </p>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 text-on-surface-variant">
                <th className="py-1 pr-3">{t("customer")}</th>
                <th className="py-1 pr-3">{t("metaFunnelReason")}</th>
                <th className="py-1 pr-3">fbp/fbc</th>
                <th className="py-1">{t("metaFunnelDate")}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((row) => (
                <tr key={row.orderId} className="border-b border-outline-variant/20">
                  <td className="py-1.5 pr-3">{row.customerName}</td>
                  <td className="py-1.5 pr-3">{t(`metaFunnelReason_${row.reason}`)}</td>
                  <td className="py-1.5 pr-3">
                    {row.metaFbp ? "fbp" : "—"}/{row.metaFbc ? "fbc" : "—"}
                  </td>
                  <td className="py-1.5">{new Date(row.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "bad" | "warn";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-red-700"
        : tone === "warn"
          ? "text-amber-700"
          : "text-on-surface";
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
