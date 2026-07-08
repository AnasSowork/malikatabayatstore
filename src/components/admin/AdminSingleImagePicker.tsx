"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { AdminMediaLibraryModal } from "@/components/admin/AdminMediaLibraryModal";
import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";

type UploadResultItem =
  | { ok: true; url: string }
  | { ok: false; error: string; filename: string };

type Aspect = "video" | "portrait" | "wide" | "square";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  aspect?: Aspect;
  onBusyChange?: (busy: boolean) => void;
};

const ASPECT_CLASS: Record<Aspect, string> = {
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/10]",
  square: "aspect-square",
};

function isLikelyImageFile(f: File): boolean {
  if (f.type.startsWith("image/")) return true;
  if (f.type === "application/octet-stream") return /\.(jpe?g|png|gif|webp|avif)$/i.test(f.name || "");
  return /\.(jpe?g|png|gif|webp|avif)$/i.test(f.name || "");
}

export function AdminSingleImagePicker({
  label,
  value,
  onChange,
  disabled,
  aspect = "wide",
  onBusyChange,
}: Props) {
  const t = useTranslations("admin");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isLikelyImageFile(file)) {
        setError(t("noRecognizedImages"));
        return;
      }

      setError("");
      const preview = URL.createObjectURL(file);
      setPendingPreview(preview);
      setUploading(true);

      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/product-images", { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as {
          results?: UploadResultItem[];
          error?: string;
        };

        if (!res.ok) throw new Error(data.error ?? t("uploadError"));

        const first = data.results?.[0];
        if (first?.ok) {
          onChange(first.url);
        } else if (first && !first.ok) {
          throw new Error(first.error);
        } else {
          throw new Error(t("uploadError"));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("uploadError"));
      } finally {
        setUploading(false);
        setPendingPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, t],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  const previewSrc = pendingPreview ?? (value ? normalizeProductImageSrc(value) : "");
  const hasImage = Boolean(previewSrc);

  return (
    <div className="admin-image-picker">
      <div className="flex items-center justify-between gap-2">
        <span className="admin-image-picker-label">{label}</span>
        {value ? (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
            className="admin-btn-danger !py-1 !px-2"
          >
            <MaterialIcon name="delete" className="!text-sm" />
            {t("removeImage")}
          </button>
        ) : null}
      </div>

      <div
        className={`admin-image-dropzone ${ASPECT_CLASS[aspect]} ${dragOver ? "admin-image-dropzone-active" : ""} ${hasImage ? "admin-image-dropzone-filled" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc} alt="" className="admin-image-preview" />
            {uploading ? (
              <div className="admin-image-overlay">
                <MaterialIcon name="cloud_upload" className="!text-2xl animate-pulse" />
                <span>{t("copyingToServer")}</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="admin-image-placeholder">
            <MaterialIcon name="add_photo_alternate" className="!text-3xl text-on-surface-variant" />
            <p>{t("homeImageDropHint")}</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/*,.jpg,.jpeg,.png,.gif,.webp,.avif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
        }}
      />

      <div className="admin-image-actions">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="admin-btn-ghost !flex-none"
        >
          <MaterialIcon name="upload" className="!text-base" />
          {hasImage ? t("homeReplaceImage") : t("homeUploadImage")}
        </button>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => setShowLibrary(true)}
          className="admin-btn-ghost !flex-none"
        >
          <MaterialIcon name="photo_library" className="!text-base" />
          {t("homeChooseImage")}
        </button>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => setShowUrl((v) => !v)}
          className="admin-btn-ghost !flex-none"
        >
          <MaterialIcon name="link" className="!text-base" />
          {t("homePasteUrl")}
        </button>
      </div>

      {showUrl ? (
        <label className="admin-field">
          <span>{t("imageUrl")}</span>
          <input
            className="admin-input font-mono text-xs"
            value={value}
            disabled={disabled || uploading}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/api/uploads/p/…"
          />
        </label>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <AdminMediaLibraryModal
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={onChange}
        currentUrl={value}
      />
    </div>
  );
}
