import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { ResolvedCategoryTiles } from "@/lib/home-content-resolve";

export function HomeCategoryTilesSection({ tiles }: ResolvedCategoryTiles) {
  const large = tiles.find((t) => t.layout === "large") ?? tiles[0];
  const small = tiles.filter((t) => t !== large);

  if (!large) return null;

  return (
    <section className="mx-auto max-w-[1920px] px-6 pb-24 md:px-24 md:pb-32">
      <div className="grid h-auto grid-cols-1 gap-6 md:grid-cols-12 md:h-[800px]">
        <Link
          href={large.href}
          className="group reveal-up relative min-h-[320px] overflow-hidden rounded-xl bg-surface-container ring-1 ring-brand-gold/10 transition-shadow duration-500 hover:ring-brand-gold/30 hover:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.35)] md:col-span-7 md:min-h-0"
        >
          <Image
            src={large.image}
            alt=""
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
            unoptimized={large.image.startsWith("http")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-brand-black/25 to-transparent" />
          <div className="tile-caption absolute bottom-10 left-10 text-brand-ivory md:bottom-12 md:left-12">
            <h3 className="mb-4 font-headline text-4xl italic md:text-5xl">{large.title}</h3>
            {large.linkLabel ? (
              <span className="brand-link font-sans text-xs uppercase tracking-widest text-white/90 transition-colors group-hover:text-white">
                {large.linkLabel} <span aria-hidden>→</span>
              </span>
            ) : null}
          </div>
        </Link>
        <div className="grid min-h-[640px] grid-rows-2 gap-6 md:col-span-5 md:min-h-0">
          {small.map((tile, i) => (
            <Link
              key={i}
              href={tile.href}
              className="group reveal-up relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-xl bg-surface-container p-8 ring-1 ring-brand-gold/10 transition-shadow duration-500 hover:ring-brand-gold/30 hover:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.35)] md:min-h-0"
            >
              <Image
                src={tile.image}
                alt=""
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                unoptimized={tile.image.startsWith("http")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-brand-black/25 to-transparent" />
              <div className={`tile-caption relative z-10 text-brand-ivory ${tile.subtitle ? "" : "absolute bottom-8 left-8"}`}>
                <h3 className={`font-headline italic text-brand-ivory ${tile.subtitle ? "mb-2 text-3xl md:text-4xl" : "mb-2 text-3xl md:text-4xl"}`}>
                  {tile.title}
                </h3>
                {tile.linkLabel ? (
                  <span className="brand-link font-sans text-[10px] uppercase tracking-widest text-white/90 transition-colors group-hover:text-white">
                    {tile.linkLabel} <span aria-hidden>→</span>
                  </span>
                ) : tile.subtitle ? (
                  <p className="font-sans text-xs uppercase tracking-widest text-white/80">{tile.subtitle}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
