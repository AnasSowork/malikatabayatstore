"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  readConsentPreferences,
  writeConsentPreferences,
  type ConsentPreferences,
} from "@/lib/consent";

export function ConsentBanner() {
  const t = useTranslations("consent");
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsentPreferences();
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
      setVisible(false);
      return;
    }
    setVisible(true);
  }, []);

  function apply(next: Pick<ConsentPreferences, "analytics" | "marketing">) {
    writeConsentPreferences(next);
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setVisible(false);
    setManageOpen(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-black/10 bg-[var(--color-surface-container-lowest,#fff)] p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
      data-consent-banner=""
      role="dialog"
      aria-label={t("title")}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-on-surface">{t("title")}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{t("body")}</p>
        </div>

        {manageOpen ? (
          <div className="space-y-3 rounded-xl border border-black/10 p-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked disabled readOnly className="mt-1" />
              <span>
                <strong>{t("necessary")}</strong>
                <span className="block text-on-surface-variant">{t("necessaryHint")}</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <strong>{t("analytics")}</strong>
                <span className="block text-on-surface-variant">{t("analyticsHint")}</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span>
                <strong>{t("marketing")}</strong>
                <span className="block text-on-surface-variant">{t("marketingHint")}</span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-[var(--color-brand-black,#111)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-ivory,#f7f3ea)]"
            onClick={() => apply({ analytics: true, marketing: true })}
          >
            {t("acceptAll")}
          </button>
          <button
            type="button"
            className="rounded-xl border border-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            onClick={() => apply({ analytics: false, marketing: false })}
          >
            {t("rejectNonEssential")}
          </button>
          {manageOpen ? (
            <button
              type="button"
              className="rounded-xl border border-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              onClick={() => apply({ analytics, marketing })}
            >
              {t("savePreferences")}
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl border border-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              onClick={() => setManageOpen(true)}
            >
              {t("manage")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
