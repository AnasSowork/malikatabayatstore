"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BrandButton } from "@/components/BrandButton";

export function NewsletterSection() {
  const t = useTranslations("home");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="brand-section-dark relative mt-24 overflow-hidden py-20 md:mt-32 md:py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-brand-gold) 0%, transparent 70%)",
        }}
      />
      <div className="brand-divider absolute inset-x-0 top-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-8 text-center">
        <p className="brand-eyebrow brand-eyebrow-light">Malikat Abayat</p>
        <h2 className="mt-4 font-headline text-3xl text-brand-ivory md:text-4xl">
          {t("newsletterTitle")}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/70">
          {t("newsletterBody")}
        </p>
        {submitted ? (
          <p className="mt-8 text-sm text-white">{t("newsletterThanks")}</p>
        ) : (
          <form
            className="mx-auto mt-10 flex max-w-md flex-col gap-4 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <input
              type="email"
              required
              placeholder={t("newsletterPlaceholder")}
              className="min-h-[52px] flex-1 rounded-xl border border-white/20 bg-brand-charcoal px-6 py-4 text-sm text-brand-ivory placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <BrandButton type="submit" variant="primary" className="btn-brand-sm shrink-0">
              {t("newsletterCta")}
            </BrandButton>
          </form>
        )}
      </div>
    </section>
  );
}
