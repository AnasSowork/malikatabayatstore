"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";

const REVIEW_IMAGES = Array.from(
  { length: 7 },
  (_, index) => `/reviews/customer-review-${String(index + 1).padStart(2, "0")}.png`,
);

export function CustomerReviewsSection() {
  const t = useTranslations("product");

  return (
    <section className="customer-reviews" aria-labelledby="customer-reviews-title">
      <div className="customer-reviews-head">
        <div>
          <p className="customer-reviews-eyebrow">{t("reviewsEyebrow")}</p>
          <h2 id="customer-reviews-title">{t("reviewsTitle")}</h2>
          <p className="customer-reviews-intro">{t("reviewsIntro")}</p>
        </div>

        <div className="customer-reviews-score" aria-label={t("reviewsCountLabel", { count: REVIEW_IMAGES.length })}>
          <strong>{REVIEW_IMAGES.length}</strong>
          <span>
            <MaterialIcon name="forum" filled />
            <small>{t("reviewsCountLabel", { count: REVIEW_IMAGES.length })}</small>
          </span>
        </div>
      </div>

      <div className="customer-reviews-trust" aria-label={t("reviewsTrustLabel")}>
        <span><MaterialIcon name="verified" filled /> {t("reviewsVerified")}</span>
        <span><MaterialIcon name="chat" filled /> {t("reviewsWhatsapp")}</span>
        <span><MaterialIcon name="location_on" filled /> {t("reviewsMorocco")}</span>
      </div>

      <div className="customer-reviews-rail">
        {REVIEW_IMAGES.map((src, index) => (
          <figure className="customer-review-card" key={src}>
            <div className="customer-review-image">
              <Image
                src={src}
                alt={t("reviewImageAlt", { number: index + 1 })}
                fill
                sizes="(max-width: 767px) 86vw, (max-width: 1199px) 45vw, 30vw"
              />
            </div>
            <figcaption>
              <span><MaterialIcon name="check_circle" filled /> {t("reviewVerifiedBuyer")}</span>
              <span>{t("reviewSource")}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="customer-reviews-note">
        <MaterialIcon name="shield" filled />
        {t("reviewsTrustNote")}
      </p>
    </section>
  );
}
