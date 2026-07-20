import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/BrandLogo";
import { BrandButton } from "@/components/BrandButton";
import { ThankYouPurchaseTracker } from "@/components/ThankYouPurchaseTracker";

export default async function ThankYouPage() {
  const t = await getTranslations("thankYou");
  const brand = await getTranslations("brand");

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <ThankYouPurchaseTracker />
      <section className="brand-card-glow mx-auto max-w-2xl rounded-2xl border border-brand-gold/20 bg-brand-cream/50 p-8 text-center md:p-12">
        <div className="brand-divider mx-auto mb-8 max-w-xs opacity-60" aria-hidden />
        <div className="mb-6 flex justify-center">
            <BrandLogo height={52} alt={brand("name")} />
          </div>
        <p className="brand-eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-4 font-headline text-4xl text-on-surface md:text-5xl">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-on-surface-variant md:text-base">
          {t("body")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <BrandButton href="/products" variant="primary" className="btn-brand-sm">
            {t("ctaShop")}
          </BrandButton>
          <BrandButton href="/" variant="outline" className="btn-brand-sm">
            {t("ctaHome")}
          </BrandButton>
        </div>
      </section>
    </main>
  );
}
