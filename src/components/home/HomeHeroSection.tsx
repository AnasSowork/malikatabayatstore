import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BrandButton } from "@/components/BrandButton";
import type { ResolvedHero } from "@/lib/home-content-resolve";

export async function HomeHeroSection(props: ResolvedHero) {
  const t = await getTranslations("home");

  return (
    <section className="relative min-h-[88vh] w-full overflow-hidden bg-brand-ivory">
      <Image
        src={props.image}
        alt=""
        fill
        priority
        className="object-cover object-[center_20%]"
        sizes="100vw"
        unoptimized={props.image.startsWith("http")}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(247,244,239,0.78)_0%,rgba(247,244,239,0.42)_26%,rgba(247,244,239,0.08)_46%,transparent_62%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[88vh] flex-col justify-center px-6 py-16 md:px-14 lg:px-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-on-surface">
          {t("heroKicker")}
        </p>
        <h1 className="mt-5 max-w-xl font-headline text-[3.4rem] font-medium leading-[0.92] tracking-[-0.03em] text-on-surface md:text-[5.2rem]">
          {t("heroTitleA")}
          <br />
          {t("heroTitleB")}
        </h1>
        <p className="hero-tagline mt-6 max-w-sm">{t("heroTagline")}</p>
        <div className="mt-8">
          <BrandButton href={props.primaryCta.href || "/products"}>
            {t("heroCta")} <span aria-hidden>→</span>
          </BrandButton>
        </div>
        <div className="mt-16 flex items-center gap-6 text-[11px] tracking-[0.22em] text-on-surface/45">
          <span className="border-b border-on-surface pb-1 text-on-surface">01</span>
          <span>02</span>
          <span>03</span>
        </div>
      </div>
      <p className="pointer-events-none absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 text-[11px] uppercase tracking-[0.42em] text-brand-ivory [writing-mode:vertical-rl] md:block">
        {t("heroAside1")} · {t("heroAside2")} · {t("heroAside3")}
      </p>
    </section>
  );
}
