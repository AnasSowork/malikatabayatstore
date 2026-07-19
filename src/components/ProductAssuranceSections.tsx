"use client";

import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import {
  localizeProductText,
  type ProductDetailContent,
} from "@/lib/product-detail-content";
import type { AppLocale } from "@/lib/product-i18n";

type Props = {
  content: ProductDetailContent;
};

export function ProductAssuranceSections({ content }: Props) {
  const t = useTranslations("product");
  const locale = useLocale() as AppLocale;

  return (
    <div className="space-y-10">
      <section className="product-love-section" aria-labelledby="product-love-title">
        <h2 id="product-love-title">{t("whyCustomersLoveIt")}</h2>
        <div className="product-love-grid">
          {content.benefits.map((benefit, index) => (
            <article key={`${benefit.icon}-${index}`} className="product-love-item">
              <span><MaterialIcon name={benefit.icon} className="!text-xl" /></span>
              <div>
                <strong>{localizeProductText(benefit.title, locale)}</strong>
                <p>{localizeProductText(benefit.body, locale)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={t("benefitsLabel")} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {content.services.map((benefit, index) => (
          <div key={`${benefit.icon}-${index}`} className="product-benefit">
            <span className="product-benefit-icon" aria-hidden>
              <MaterialIcon name={benefit.icon} className="!text-xl" />
            </span>
            <span>
              <strong>{localizeProductText(benefit.title, locale)}</strong>
              <small>{localizeProductText(benefit.body, locale)}</small>
            </span>
          </div>
        ))}
      </section>

      <section className="product-accordions" aria-label={t("informationLabel")}>
        {content.accordions.map((detail, index) => (
          <details key={`${detail.title.ar}-${index}`} className="product-accordion" open={index === 0}>
            <summary>
              <span>{localizeProductText(detail.title, locale)}</span>
              <MaterialIcon name="add" className="product-accordion-icon !text-xl" />
            </summary>
            <p>{localizeProductText(detail.body, locale)}</p>
          </details>
        ))}
      </section>

      {content.faqs.length > 0 ? (
        <section className="product-faq" aria-labelledby="product-faq-title">
          <h2 id="product-faq-title">{t("faqTitle")}</h2>
          <div className="product-accordions">
            {content.faqs.map((faq, index) => (
              <details key={`${faq.question.ar}-${index}`} className="product-accordion">
                <summary>
                  <span>{localizeProductText(faq.question, locale)}</span>
                  <MaterialIcon name="add" className="product-accordion-icon !text-xl" />
                </summary>
                <p>{localizeProductText(faq.answer, locale)}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <aside className="product-trust-card">
        <div className="product-trust-card-head">
          <span className="product-trust-mark" aria-hidden>
            <MaterialIcon name="workspace_premium" className="!text-2xl" />
          </span>
          <div>
            <p className="product-trust-eyebrow">{localizeProductText(content.trust.eyebrow, locale)}</p>
            <h2>{localizeProductText(content.trust.title, locale)}</h2>
          </div>
        </div>
        <p>{localizeProductText(content.trust.body, locale)}</p>
        <ul>
          {content.trust.points.map((point, index) => (
            <li key={index}>{localizeProductText(point, locale)}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
