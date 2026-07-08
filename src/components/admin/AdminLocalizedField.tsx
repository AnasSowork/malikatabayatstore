"use client";

import { useState } from "react";
import type { LocalizedText } from "@/lib/home-content-types";

const LANGS: { key: keyof LocalizedText; label: string; dir?: "rtl" }[] = [
  { key: "en", label: "EN" },
  { key: "ar", label: "AR", dir: "rtl" },
  { key: "fr", label: "FR" },
];

type Props = {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  multiline?: boolean;
};

export function AdminLocalizedField({ label, value, onChange, multiline }: Props) {
  const [lang, setLang] = useState<keyof LocalizedText>("en");
  const active = LANGS.find((l) => l.key === lang)!;

  return (
    <fieldset className="admin-field-group">
      <div className="admin-field-group-head">
        <legend className="admin-field-group-label">{label}</legend>
        <div className="admin-segmented admin-segmented-sm">
          {LANGS.map(({ key, label: langLabel }) => (
            <button
              key={key}
              type="button"
              className={lang === key ? "admin-segmented-active" : ""}
              onClick={() => setLang(key)}
            >
              {langLabel}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          className="admin-input min-h-[88px]"
          dir={active.dir}
          value={value[lang]}
          onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        />
      ) : (
        <input
          className="admin-input"
          dir={active.dir}
          value={value[lang]}
          onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        />
      )}
    </fieldset>
  );
}

export function AdminTextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input
        className="admin-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
