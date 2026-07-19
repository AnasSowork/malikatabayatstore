"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

const REVIEW_IMAGES = Array.from(
  { length: 7 },
  (_, index) => `/reviews/customer-review-${String(index + 1).padStart(2, "0")}.png`,
);

export function CustomerReviewsSection() {
  const t = useTranslations("product");

  return (
    <section className="customer-reviews" aria-labelledby="customer-reviews-title">
      <h2 id="customer-reviews-title">{t("reviewsTitle")}</h2>

      <div className="customer-reviews-rail">
        {REVIEW_IMAGES.map((src, index) => (
          <div className="customer-review-card" key={src}>
            <div className="customer-review-image">
              <Image
                src={src}
                alt={t("reviewImageAlt", { number: index + 1 })}
                fill
                sizes="(max-width: 767px) 86vw, (max-width: 1199px) 45vw, 30vw"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
