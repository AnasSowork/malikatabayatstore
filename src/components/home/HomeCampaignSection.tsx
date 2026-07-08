import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { BrandButton } from "@/components/BrandButton";
import type { ResolvedCampaign } from "@/lib/home-content-resolve";

export function HomeCampaignSection(props: ResolvedCampaign) {
  return (
    <section className="py-16 md:py-24">
      <div className="relative h-[min(74vh,640px)] w-full overflow-hidden">
        <Image
          src={props.image}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized={props.image.startsWith("http")}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-brand-black/55 px-8">
          <div className="reveal-up max-w-2xl text-center text-brand-ivory">
            <div className="brand-ornament mb-6" aria-hidden>
              <span className="brand-ornament-diamond" />
            </div>
            <span className="brand-eyebrow brand-eyebrow-light mb-6 block">{props.eyebrow}</span>
            <h2 className="mb-6 font-headline text-4xl leading-none md:text-6xl lg:text-7xl">
              {props.title}{" "}
              <span className="italic brand-gold-text">{props.titleItalic}</span>
            </h2>
            <p className="mb-10 font-sans text-sm leading-relaxed text-white/80 md:text-base">{props.body}</p>
            <BrandButton href={props.href} variant="ghost">
              {props.ctaLabel}
            </BrandButton>
          </div>
        </div>
        <div className="brand-divider absolute inset-x-0 top-0 opacity-70" aria-hidden />
        <div className="brand-divider absolute inset-x-0 bottom-0 opacity-70" aria-hidden />
      </div>
    </section>
  );
}
