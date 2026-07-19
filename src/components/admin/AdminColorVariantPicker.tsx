"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { HexColorPicker } from "react-colorful";
import { MaterialIcon } from "@/components/MaterialIcon";
import type { ColorVariantDraft } from "@/components/admin/types";

const PRESET_PALETTE = [
  { name: "Black", hex: "#1A1A1A" },
  { name: "Charcoal", hex: "#36454F" },
  { name: "Navy", hex: "#1B2838" },
  { name: "Burgundy", hex: "#5C1A2E" },
  { name: "Emerald", hex: "#1B4D3E" },
  { name: "Taupe", hex: "#8B7D6B" },
  { name: "Mocha", hex: "#6F4E37" },
  { name: "Dusty Rose", hex: "#C4A4A4" },
  { name: "Deep Plum", hex: "#4A1942" },
  { name: "Olive", hex: "#4A5240" },
  { name: "Grey", hex: "#6B6B6B" },
  { name: "Ivory", hex: "#FAF7F2" },
] as const;

function normalizeHex(value: string): string {
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "#1A1A1A";
}

function isValidHex(value: string): boolean {
  const raw = value.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{3}$/.test(raw) || /^[0-9a-fA-F]{6}$/.test(raw);
}

function newVariant(partial?: Partial<ColorVariantDraft>): ColorVariantDraft {
  return {
    id: crypto.randomUUID(),
    name: partial?.name ?? "",
    hex: normalizeHex(partial?.hex ?? "#1A1A1A"),
    imageUrl: partial?.imageUrl ?? null,
  };
}

type EditorMode = "create" | "edit";

type Props = {
  value: ColorVariantDraft[];
  onChange: (variants: ColorVariantDraft[]) => void;
  productImages?: string[];
  disabled?: boolean;
};

export function AdminColorVariantPicker({
  value,
  onChange,
  productImages = [],
  disabled,
}: Props) {
  const t = useTranslations("admin");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [draftName, setDraftName] = useState("");
  const [draftHex, setDraftHex] = useState("#1A1A1A");
  const [hexInput, setHexInput] = useState("#1A1A1A");
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => value.find((v) => v.id === selectedId) ?? null,
    [value, selectedId],
  );

  useEffect(() => {
    if (!editorOpen) return;
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editorOpen, selectedId]);

  function openCreate(initial?: { name?: string; hex?: string; imageUrl?: string | null }) {
    const hex = normalizeHex(initial?.hex ?? "#1A1A1A");
    setEditorMode("create");
    setSelectedId(null);
    setDraftName(initial?.name ?? "");
    setDraftHex(hex);
    setHexInput(hex);
    setDraftImageUrl(initial?.imageUrl ?? null);
    setEditorOpen(true);
  }

  function openEdit(variant: ColorVariantDraft) {
    setEditorMode("edit");
    setSelectedId(variant.id);
    setDraftName(variant.name);
    setDraftHex(variant.hex);
    setHexInput(variant.hex);
    setDraftImageUrl(variant.imageUrl);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setSelectedId(null);
  }

  function applyEditor() {
    const name = draftName.trim();
    if (!name) return;

    const hex = normalizeHex(isValidHex(hexInput) ? hexInput : draftHex);
    const duplicate = value.some(
      (v) => v.name.toLowerCase() === name.toLowerCase() && v.id !== selectedId,
    );
    if (duplicate) return;

    if (editorMode === "edit" && selectedId) {
      onChange(
        value.map((v) =>
          v.id === selectedId ? { ...v, name, hex, imageUrl: draftImageUrl } : v,
        ),
      );
    } else {
      onChange([...value, newVariant({ name, hex, imageUrl: draftImageUrl })]);
    }
    closeEditor();
  }

  function remove(id: string) {
    onChange(value.filter((v) => v.id !== id));
    if (selectedId === id) closeEditor();
  }

  function move(id: string, dir: -1 | 1) {
    const idx = value.findIndex((v) => v.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= value.length) return;
    const copy = [...value];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    onChange(copy);
  }

  function applyPreset(preset: { name: string; hex: string }) {
    if (editorOpen) {
      setDraftName(preset.name);
      setDraftHex(normalizeHex(preset.hex));
      setHexInput(normalizeHex(preset.hex));
      return;
    }
    if (value.some((v) => v.name.toLowerCase() === preset.name.toLowerCase())) return;
    onChange([...value, newVariant(preset)]);
  }

  function onHexInputChange(raw: string) {
    setHexInput(raw);
    if (isValidHex(raw)) setDraftHex(normalizeHex(raw));
  }

  const canApply = draftName.trim().length > 0 && isValidHex(hexInput || draftHex);
  const duplicateName =
    draftName.trim().length > 0 &&
    value.some(
      (v) => v.name.toLowerCase() === draftName.trim().toLowerCase() && v.id !== selectedId,
    );

  return (
    <div className="admin-color-picker">
      <p className="admin-color-picker-hint">{t("colorPickerHint")}</p>

      {value.length > 0 ? (
        <div className="admin-color-chip-grid">
          {value.map((variant, index) => {
            const active = selectedId === variant.id && editorOpen;
            return (
              <div
                key={variant.id}
                className={`admin-color-chip ${active ? "admin-color-chip-active" : ""}`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  className="admin-color-chip-main"
                  onClick={() => openEdit(variant)}
                >
                  <span className="admin-color-chip-swatch" style={{ backgroundColor: variant.hex }} />
                  <span className="admin-color-chip-label">{variant.name}</span>
                  <span className="admin-color-chip-hex">{variant.hex}</span>
                </button>
                <div className="admin-color-chip-actions">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    className="admin-color-chip-action"
                    onClick={() => move(variant.id, -1)}
                    aria-label={t("moveUp")}
                  >
                    <MaterialIcon name="keyboard_arrow_up" className="!text-base" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === value.length - 1}
                    className="admin-color-chip-action"
                    onClick={() => move(variant.id, 1)}
                    aria-label={t("moveDown")}
                  >
                    <MaterialIcon name="keyboard_arrow_down" className="!text-base" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className="admin-color-chip-action admin-color-chip-action-danger"
                    onClick={() => remove(variant.id)}
                    aria-label={t("removeColor")}
                  >
                    <MaterialIcon name="delete" className="!text-base" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="admin-color-picker-empty">{t("noColorsYet")}</p>
      )}

      <div className="admin-color-presets">
        <span className="admin-color-presets-label">{t("quickColors")}</span>
        <div className="admin-color-presets-grid">
          {PRESET_PALETTE.map((preset) => {
            const taken = value.some((v) => v.name.toLowerCase() === preset.name.toLowerCase());
            return (
              <button
                key={preset.name}
                type="button"
                disabled={disabled}
                className={`admin-color-preset-tile ${taken && !editorOpen ? "admin-color-preset-tile-taken" : ""}`}
                title={preset.name}
                onClick={() => applyPreset(preset)}
              >
                <span style={{ backgroundColor: preset.hex }} />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!editorOpen ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => openCreate()}
          className="admin-btn-ghost admin-color-add-btn"
        >
          <MaterialIcon name="add" className="!text-base" />
          {t("addColor")}
        </button>
      ) : null}

      {editorOpen ? (
        <div ref={editorRef} className="admin-color-editor">
          <div className="admin-color-editor-head">
            <h4 className="admin-color-editor-title">
              {editorMode === "edit" && selected ? selected.name : t("addColor")}
            </h4>
            <button type="button" className="admin-icon-btn" onClick={closeEditor} aria-label={t("cancel")}>
              <MaterialIcon name="close" className="!text-lg" />
            </button>
          </div>

          <div className="admin-color-editor-body">
            <div className="admin-color-editor-picker">
              <HexColorPicker
                color={draftHex}
                onChange={(hex) => {
                  setDraftHex(normalizeHex(hex));
                  setHexInput(normalizeHex(hex));
                }}
              />
            </div>

            <div className="admin-color-editor-fields">
              <label className="admin-field">
                <span>{t("colorNamePlaceholder")}</span>
                <input
                  className="admin-input"
                  value={draftName}
                  disabled={disabled}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={t("colorNamePlaceholder")}
                />
              </label>

              <label className="admin-field">
                <span>{t("colorHexLabel")}</span>
                <div className="admin-color-hex-row">
                  <span className="admin-color-hex-preview" style={{ backgroundColor: draftHex }} />
                  <input
                    className="admin-input font-mono uppercase"
                    value={hexInput}
                    disabled={disabled}
                    onChange={(e) => onHexInputChange(e.target.value)}
                    placeholder="#1A1A1A"
                  />
                </div>
              </label>

              <div className="admin-field">
                <span>{t("colorImageLabel")}</span>
                {productImages.length > 0 ? (
                  <div className="admin-color-image-grid">
                    <button
                      type="button"
                      disabled={disabled}
                      className={`admin-color-image-option ${draftImageUrl == null ? "admin-color-image-option-active" : ""}`}
                      onClick={() => setDraftImageUrl(null)}
                    >
                      {t("colorImageNone")}
                    </button>
                    {productImages.map((url) => (
                      <button
                        key={url}
                        type="button"
                        disabled={disabled}
                        className={`admin-color-image-option ${draftImageUrl === url ? "admin-color-image-option-active" : ""}`}
                        onClick={() => setDraftImageUrl(url)}
                        title={url}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="admin-color-picker-hint">{t("colorImageUploadFirst")}</p>
                )}
              </div>

              {duplicateName ? (
                <p className="admin-color-editor-error">{t("duplicateColor")}</p>
              ) : null}

              <div className="admin-color-editor-actions">
                <button type="button" className="admin-btn-ghost" onClick={closeEditor}>
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="admin-btn-primary"
                  disabled={disabled || !canApply || duplicateName}
                  onClick={applyEditor}
                >
                  {editorMode === "edit" ? t("applyColor") : t("addColor")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function draftsFromProductVariants(
  variants: { name: string; hex: string | null; imageUrl?: string | null }[],
): ColorVariantDraft[] {
  return variants.map((v) =>
    newVariant({ name: v.name, hex: v.hex ?? "#000000", imageUrl: v.imageUrl ?? null }),
  );
}

export function draftsToPayload(variants: ColorVariantDraft[]) {
  return variants
    .filter((v) => v.name.trim())
    .map((v) => ({
      name: v.name.trim(),
      hex: normalizeHex(v.hex),
      imageUrl: v.imageUrl,
    }));
}
