"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/lib/product-i18n";
import {
  localizeProductText,
  type ProductTestimonial,
} from "@/lib/product-detail-content";
import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";

function quoteTone(quote: string): "short" | "medium" | "long" {
  if (quote.length > 180) return "long";
  if (quote.length > 80) return "medium";
  return "short";
}

export function ProductTestimonials({ items }: { items: ProductTestimonial[] }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("product");
  const visible = items
    .map((item) => ({
      quote: localizeProductText(item.quote, locale),
      name: localizeProductText(item.name, locale),
      imageUrl: item.imageUrl ? normalizeProductImageSrc(item.imageUrl) : "",
    }))
    .filter((item) => item.quote || item.imageUrl);

  if (visible.length === 0) return null;

  const count = visible.length === 1 ? "1" : visible.length === 2 ? "2" : "many";

  return (
    <section className="product-testimonials" aria-label={t("testimonialsTitle")}>
      <p className="product-testimonials-kicker">{t("testimonialsTitle")}</p>
      <div className="product-testimonials-grid" data-count={count}>
        {visible.map((item, index) => {
          const tone = quoteTone(item.quote);
          return (
            <article
              key={`${item.name}-${index}`}
              className={[
                "product-testimonial",
                item.imageUrl ? "product-testimonial-with-image" : "product-testimonial-text",
                item.quote ? `product-testimonial-${tone}` : "product-testimonial-image-only",
              ].join(" ")}
            >
              {item.imageUrl ? (
                <figure className="product-testimonial-figure">
                  <img src={item.imageUrl} alt={item.name || t("testimonialImageAlt")} />
                </figure>
              ) : null}
              {item.quote ? (
                <blockquote className="product-testimonial-quote">
                  <p>{item.quote}</p>
                  {item.name ? <footer>{item.name}</footer> : null}
                </blockquote>
              ) : item.name ? (
                <p className="product-testimonial-name">{item.name}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
