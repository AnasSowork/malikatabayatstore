import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { BrandButton } from "@/components/BrandButton";
import type { ResolvedHero } from "@/lib/home-content-resolve";

export function HomeHeroSection(props: ResolvedHero) {
  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden bg-brand-black">
      <div className="hero-zoom absolute inset-0 z-0">
        <Image
          src={props.image}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          unoptimized={props.image.startsWith("http")}
        />
      </div>
      <div className="hero-veil pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-brand-black/70 via-brand-black/45 to-brand-black/80" aria-hidden />
      <div
        className="hero-veil pointer-events-none absolute inset-0 z-[2] opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% 42%, rgba(0,0,0,0.28) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <div className="hero-rise hero-rise-1 mb-8 inline-flex">
          <BrandLogo height={76} priority variant="dark" alt="Malikat Abayat" />
        </div>
        <div className="hero-rise hero-rise-2 brand-ornament mb-5" aria-hidden>
          <span className="brand-ornament-diamond" />
        </div>
        <h1 className="hero-rise hero-rise-3 font-headline text-5xl font-extralight italic tracking-tighter text-brand-ivory drop-shadow-2xl md:text-7xl lg:text-8xl">
          {props.line1}{" "}
          <span className="font-normal not-italic brand-gold-text">{props.line2}</span>
        </h1>
        <p className="hero-rise hero-rise-4 hero-tagline mt-6 max-w-lg px-2 md:max-w-xl">
          {props.tagline}
        </p>
        <div className="hero-rise hero-rise-5 mt-12 flex flex-wrap items-center justify-center gap-4">
          <BrandButton href={props.primaryCta.href} variant="primary">
            {props.primaryCta.label}
          </BrandButton>
          {props.secondaryCta.label ? (
            <BrandButton href={props.secondaryCta.href} variant="ghost">
              {props.secondaryCta.label}
            </BrandButton>
          ) : null}
        </div>
      </div>
      {props.showScrollHint ? (
        <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 text-white/50">
          <span className="text-[10px] uppercase tracking-[0.4em]">{props.scrollLabel}</span>
          <div className="brand-shimmer-line h-12 w-px" />
        </div>
      ) : null}
    </section>
  );
}
