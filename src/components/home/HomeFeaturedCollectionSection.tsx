import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { BrandButton } from "@/components/BrandButton";
import type { ResolvedFeaturedCollection } from "@/lib/home-content-resolve";

export function HomeFeaturedCollectionSection(props: ResolvedFeaturedCollection) {
  return (
    <section className="mx-auto max-w-[1920px] px-6 py-20 md:px-24 md:py-28">
      <div className="reveal-up mb-16 flex flex-col items-end justify-between gap-8 md:mb-20 md:flex-row">
        <div className="max-w-xl">
          <span className="brand-eyebrow mb-4 block">{props.eyebrow}</span>
          <h2 className="font-headline text-4xl leading-tight text-on-surface md:text-6xl">
            {props.title}{" "}
            <span className="italic brand-gold-text">{props.titleItalic}</span> {props.titleEnd}
          </h2>
        </div>
        <BrandButton href={props.viewAllHref} variant="outline" className="btn-brand-sm">
          {props.viewAllLabel}
        </BrandButton>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
        {props.items.map(({ image, href, shift }, i) => (
          <Link href={href} key={i} className={`group reveal-up block ${shift ? "md:mt-24" : ""}`}>
            <div className="relative mb-6 aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low ring-1 ring-brand-gold/10 transition-all duration-500 group-hover:ring-brand-gold/30 group-hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)]">
              <Image
                src={image}
                alt=""
                width={600}
                height={800}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                unoptimized={image.startsWith("http")}
              />
              <div className="card-scrim" aria-hidden />
              <div className="card-quickview" aria-hidden>
                <span className="card-quickview-pill">{props.viewAllLabel}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
