"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import type {
  ProductDetailContent,
  ProductFaqItem,
  ProductLocalizedText,
} from "@/lib/product-detail-content";

type Language = "ar" | "fr";

type Props = {
  value: ProductDetailContent;
  onChange: (value: ProductDetailContent) => void;
  disabled?: boolean;
};

const emptyText = (): ProductLocalizedText => ({ ar: "", fr: "" });
const emptyFaq = (): ProductFaqItem => ({ question: emptyText(), answer: emptyText() });

export function AdminProductDetailsEditor({ value, onChange, disabled }: Props) {
  const t = useTranslations("admin");
  const [language, setLanguage] = useState<Language>("ar");

  const setText = (
    current: ProductLocalizedText,
    textValue: string,
  ): ProductLocalizedText => ({ ...current, [language]: textValue });

  return (
    <div className="product-detail-editor">
      <div className="admin-segmented admin-segmented-sm self-start">
        {(["ar", "fr"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={language === item ? "admin-segmented-active" : ""}
            onClick={() => setLanguage(item)}
          >
            {item === "ar" ? "العربية" : "Français"}
          </button>
        ))}
      </div>

      <label className="admin-field">
        <span>{t("productShortDescription")}</span>
        <textarea
          className="admin-input"
          rows={2}
          dir={language === "ar" ? "rtl" : "ltr"}
          disabled={disabled}
          value={value.shortDescription[language]}
          onChange={(event) =>
            onChange({
              ...value,
              shortDescription: setText(value.shortDescription, event.target.value),
            })
          }
        />
      </label>

      {(["benefits", "services"] as const).map((group) => (
        <section key={group} className="product-detail-editor-group">
          <h4>{t(group === "benefits" ? "productBenefits" : "productServices")}</h4>
          <div className="product-detail-editor-grid">
            {value[group].map((item, index) => (
              <article key={`${group}-${index}`} className="product-detail-editor-card">
                <label className="admin-field">
                  <span>{t("productIcon")}</span>
                  <input
                    className="admin-input font-mono"
                    disabled={disabled}
                    value={item.icon}
                    onChange={(event) => {
                      const items = [...value[group]];
                      items[index] = { ...item, icon: event.target.value };
                      onChange({ ...value, [group]: items });
                    }}
                  />
                </label>
                <label className="admin-field">
                  <span>{t("homeTitle")}</span>
                  <input
                    className="admin-input"
                    dir={language === "ar" ? "rtl" : "ltr"}
                    disabled={disabled}
                    value={item.title[language]}
                    onChange={(event) => {
                      const items = [...value[group]];
                      items[index] = {
                        ...item,
                        title: setText(item.title, event.target.value),
                      };
                      onChange({ ...value, [group]: items });
                    }}
                  />
                </label>
                <label className="admin-field">
                  <span>{t("homeBody")}</span>
                  <textarea
                    className="admin-input"
                    rows={2}
                    dir={language === "ar" ? "rtl" : "ltr"}
                    disabled={disabled}
                    value={item.body[language]}
                    onChange={(event) => {
                      const items = [...value[group]];
                      items[index] = {
                        ...item,
                        body: setText(item.body, event.target.value),
                      };
                      onChange({ ...value, [group]: items });
                    }}
                  />
                </label>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="product-detail-editor-group">
        <h4>{t("productInformationSections")}</h4>
        {value.accordions.map((item, index) => (
          <div key={`accordion-${index}`} className="product-detail-editor-row">
            <input
              className="admin-input"
              dir={language === "ar" ? "rtl" : "ltr"}
              disabled={disabled}
              value={item.title[language]}
              onChange={(event) => {
                const items = [...value.accordions];
                items[index] = { ...item, title: setText(item.title, event.target.value) };
                onChange({ ...value, accordions: items });
              }}
            />
            <textarea
              className="admin-input"
              rows={2}
              dir={language === "ar" ? "rtl" : "ltr"}
              disabled={disabled}
              value={item.body[language]}
              onChange={(event) => {
                const items = [...value.accordions];
                items[index] = { ...item, body: setText(item.body, event.target.value) };
                onChange({ ...value, accordions: items });
              }}
            />
          </div>
        ))}
      </section>

      <section className="product-detail-editor-group">
        <div className="flex items-center justify-between gap-3">
          <h4>{t("productFaqs")}</h4>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={disabled || value.faqs.length >= 10}
            onClick={() => onChange({ ...value, faqs: [...value.faqs, emptyFaq()] })}
          >
            <MaterialIcon name="add" className="!text-lg" />
            {t("productAddFaq")}
          </button>
        </div>
        {value.faqs.map((item, index) => (
          <div key={`faq-${index}`} className="product-detail-editor-row">
            <input
              className="admin-input"
              placeholder={t("productFaqQuestion")}
              dir={language === "ar" ? "rtl" : "ltr"}
              disabled={disabled}
              value={item.question[language]}
              onChange={(event) => {
                const items = [...value.faqs];
                items[index] = {
                  ...item,
                  question: setText(item.question, event.target.value),
                };
                onChange({ ...value, faqs: items });
              }}
            />
            <textarea
              className="admin-input"
              rows={2}
              placeholder={t("productFaqAnswer")}
              dir={language === "ar" ? "rtl" : "ltr"}
              disabled={disabled}
              value={item.answer[language]}
              onChange={(event) => {
                const items = [...value.faqs];
                items[index] = { ...item, answer: setText(item.answer, event.target.value) };
                onChange({ ...value, faqs: items });
              }}
            />
            <button
              type="button"
              className="admin-icon-btn"
              disabled={disabled}
              aria-label={t("delete")}
              onClick={() =>
                onChange({ ...value, faqs: value.faqs.filter((_, itemIndex) => itemIndex !== index) })
              }
            >
              <MaterialIcon name="delete" className="!text-lg" />
            </button>
          </div>
        ))}
      </section>

      <section className="product-detail-editor-group">
        <h4>{t("productTrustPanel")}</h4>
        {(["eyebrow", "title", "body"] as const).map((field) => (
          <label key={field} className="admin-field">
            <span>{t(`productTrust${field[0].toUpperCase()}${field.slice(1)}`)}</span>
            {field === "body" ? (
              <textarea
                className="admin-input"
                rows={2}
                dir={language === "ar" ? "rtl" : "ltr"}
                disabled={disabled}
                value={value.trust[field][language]}
                onChange={(event) =>
                  onChange({
                    ...value,
                    trust: {
                      ...value.trust,
                      [field]: setText(value.trust[field], event.target.value),
                    },
                  })
                }
              />
            ) : (
              <input
                className="admin-input"
                dir={language === "ar" ? "rtl" : "ltr"}
                disabled={disabled}
                value={value.trust[field][language]}
                onChange={(event) =>
                  onChange({
                    ...value,
                    trust: {
                      ...value.trust,
                      [field]: setText(value.trust[field], event.target.value),
                    },
                  })
                }
              />
            )}
          </label>
        ))}
        {value.trust.points.map((point, index) => (
          <input
            key={`trust-point-${index}`}
            className="admin-input"
            dir={language === "ar" ? "rtl" : "ltr"}
            disabled={disabled}
            value={point[language]}
            onChange={(event) => {
              const points = [...value.trust.points];
              points[index] = setText(point, event.target.value);
              onChange({ ...value, trust: { ...value.trust, points } });
            }}
          />
        ))}
      </section>
    </div>
  );
}
