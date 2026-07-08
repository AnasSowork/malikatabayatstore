"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";

type UploadResultItem =
  | { ok: true; url: string }
  | { ok: false; error: string; filename: string };

type PendingItem = {
  id: string;
  blobUrl: string;
  file: File;
};

type Props = {
  value: string[];
  setUrls: Dispatch<SetStateAction<string[]>>;
  disabled?: boolean;
  maxFiles?: number;
  /** True while local previews exist or a file is uploading — block form submit until copies finish. */
  onBusyChange?: (busy: boolean) => void;
};

function isLikelyImageFile(f: File): boolean {
  if (f.type.startsWith("image/")) return true;
  if (f.type === "application/octet-stream") return /\.(jpe?g|png|gif|webp|avif)$/i.test(f.name || "");
  return /\.(jpe?g|png|gif|webp|avif)$/i.test(f.name || "");
}

export function ProductImageUploader({ value, setUrls, disabled, maxFiles = 12, onBusyChange }: Props) {
  const t = useTranslations("admin");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const usedSlots = value.length + pending.length;
  const remaining = maxFiles - usedSlots;

  useEffect(() => {
    onBusyChange?.(uploading || pending.length > 0);
  }, [uploading, pending.length, onBusyChange]);

  useEffect(() => {
    return () => {
      onBusyChange?.(false);
      for (const p of pendingRef.current) {
        URL.revokeObjectURL(p.blobUrl);
      }
    };
  }, [onBusyChange]);

  const removePending = useCallback((id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.blobUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList).filter(isLikelyImageFile);
      if (arr.length === 0) {
        setError(t("noRecognizedImages"));
        return;
      }
      const slice = arr.slice(0, Math.max(0, maxFiles - value.length - pending.length));
      if (slice.length === 0) return;

      const batch: PendingItem[] = slice.map((file) => ({
        id: crypto.randomUUID(),
        blobUrl: URL.createObjectURL(file),
        file,
      }));

      setError(null);
      setPending((p) => [...p, ...batch]);
      setUploading(true);

      const failures: string[] = [];

      try {
        for (const item of batch) {
          const body = new FormData();
          body.append("file", item.file);

          let res: Response;
          try {
            res = await fetch("/api/admin/product-images", {
              method: "POST",
              body,
            });
          } catch {
            failures.push(`${item.file.name}: ${t("uploadError")}`);
            removePending(item.id);
            continue;
          }

          const data = (await res.json().catch(() => ({}))) as {
            results?: UploadResultItem[];
            error?: string;
          };

          if (!res.ok) {
            failures.push(`${item.file.name}: ${data.error ?? t("uploadError")}`);
            removePending(item.id);
            continue;
          }

          const results = data.results ?? [];
          const first = results[0];
          if (first?.ok) {
            const blobUrl = item.blobUrl;
            setPending((p) => p.filter((x) => x.id !== item.id));
            setUrls((prev) => [...prev, first.url]);
            queueMicrotask(() => URL.revokeObjectURL(blobUrl));
          } else if (first && !first.ok) {
            failures.push(`${first.filename}: ${first.error}`);
            removePending(item.id);
          } else {
            failures.push(`${item.file.name}: ${t("uploadError")}`);
            removePending(item.id);
          }
        }

        if (failures.length > 0) {
          setError(failures.join(" · "));
        }
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [maxFiles, pending.length, removePending, setUrls, t, value.length],
  );

  function removeAt(i: number) {
    if (i < value.length) {
      setUrls((prev) => prev.filter((_, idx) => idx !== i));
    } else {
      const p = pending[i - value.length];
      if (p) removePending(p.id);
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (i < 0 || j < 0 || i >= value.length || j >= value.length) return;
    setUrls((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const hasGrid = value.length > 0 || pending.length > 0;

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <div className="flex flex-col gap-1">
        <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
          {t("uploadImages")}
        </span>
        <p className="font-sans text-xs text-on-surface-variant">{t("uploadCopyHint")}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,image/*,.jpg,.jpeg,.png,.gif,.webp,.avif,.heic"
        multiple
        className="sr-only"
        disabled={disabled || uploading || remaining <= 0}
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) void uploadFiles(list);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || uploading || remaining <= 0}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-2.5 font-sans text-xs uppercase tracking-widest transition-colors hover:border-primary disabled:opacity-50"
        >
          {uploading ? t("uploadingImages") : t("addPhotos")}
        </button>
        <span className="font-sans text-xs text-on-surface-variant">
          {usedSlots} / {maxFiles} · {t("imageOrderHint")}
        </span>
      </div>

      {error ? <p className="whitespace-pre-wrap text-sm text-error">{error}</p> : null}

      {hasGrid ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, i) => (
            <li
              key={`saved-${url}-${i}`}
              className="relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-low"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={normalizeProductImageSrc(url)}
                alt=""
                className="aspect-square w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.25";
                }}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5">
                <button
                  type="button"
                  disabled={disabled || uploading || i === 0}
                  onClick={() => move(i, -1)}
                  className="rounded bg-white/20 px-2 py-1 text-xs text-white disabled:opacity-30"
                  aria-label={t("moveUp")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || uploading || i === value.length - 1}
                  onClick={() => move(i, 1)}
                  className="rounded bg-white/20 px-2 py-1 text-xs text-white disabled:opacity-30"
                  aria-label={t("moveDown")}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => removeAt(i)}
                  className="rounded bg-error/90 px-2 py-1 text-xs text-on-primary"
                >
                  {t("removeImage")}
                </button>
              </div>
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {i + 1}
              </span>
            </li>
          ))}
          {pending.map((p, pi) => {
            const idx = value.length + pi;
            return (
              <li
                key={p.id}
                className="relative overflow-hidden rounded-xl border border-dashed border-secondary/50 bg-surface-container-low"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.blobUrl} alt="" className="aspect-square w-full object-cover" />
                {uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span className="rounded bg-black/70 px-2 py-1 font-sans text-[10px] uppercase tracking-widest text-white">
                      {t("copyingToServer")}
                    </span>
                  </div>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 flex justify-end bg-black/55 p-1.5">
                  <button
                    type="button"
                    disabled={disabled || uploading}
                    onClick={() => removePending(p.id)}
                    className="rounded bg-error/90 px-2 py-1 text-xs text-on-primary"
                  >
                    {t("removeImage")}
                  </button>
                </div>
                <span className="absolute left-1 top-1 rounded bg-secondary/90 px-1.5 py-0.5 font-mono text-[10px] text-on-secondary">
                  {idx + 1}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low px-4 py-8 text-center font-sans text-sm text-on-surface-variant">
          {t("noImagesYet")}
        </p>
      )}
    </div>
  );
}
