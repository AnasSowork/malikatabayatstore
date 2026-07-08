"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";
import type { MediaItem } from "@/app/api/admin/media/route";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  currentUrl?: string;
};

export function AdminMediaLibraryModal({ open, onClose, onSelect, currentUrl }: Props) {
  const t = useTranslations("admin");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/media");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch {
      setError(t("mediaLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.url.toLowerCase().includes(q);
  });

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="admin-modal admin-media-modal max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <header className="admin-modal-header">
          <div>
            <p className="brand-eyebrow">{t("navHome")}</p>
            <h2 className="font-headline text-2xl text-on-surface">{t("mediaLibrary")}</h2>
          </div>
          <button type="button" onClick={onClose} className="admin-icon-btn" aria-label={t("cancel")}>
            <MaterialIcon name="close" className="!text-xl" />
          </button>
        </header>

        <div className="admin-modal-body space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="admin-field flex-1">
              <span>{t("searchPlaceholder")}</span>
              <input
                className="admin-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("mediaSearchPlaceholder")}
              />
            </label>
            <button type="button" onClick={() => void load()} disabled={loading} className="admin-btn-ghost !flex-none sm:mt-5">
              <MaterialIcon name="refresh" className={`!text-base ${loading ? "animate-spin" : ""}`} />
              {t("refresh")}
            </button>
          </div>

          {error ? <p className="text-sm text-error">{error}</p> : null}

          {loading ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">{t("loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="admin-media-empty">{t("mediaEmpty")}</p>
          ) : (
            <ul className="admin-media-grid">
              {filtered.map((item) => {
                const selected = currentUrl === item.url;
                return (
                  <li key={item.url}>
                    <button
                      type="button"
                      className={`admin-media-tile ${selected ? "admin-media-tile-selected" : ""}`}
                      onClick={() => {
                        onSelect(item.url);
                        onClose();
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={normalizeProductImageSrc(item.url)} alt="" />
                      <span className="admin-media-tile-meta">
                        <span className="truncate">{item.name}</span>
                        <span className="admin-media-tile-badge">
                          {item.source === "product" ? t("mediaFromProduct") : t("mediaUpload")}
                        </span>
                      </span>
                      {selected ? (
                        <span className="admin-media-tile-check">
                          <MaterialIcon name="check_circle" className="!text-lg" />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
