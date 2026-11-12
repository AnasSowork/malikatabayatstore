import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { ResolvedCategoryTiles } from "@/lib/home-content-resolve";

export function HomeCategoryTilesSection({ tiles }: ResolvedCategoryTiles) {
  const stories = tiles.slice(0, 3);
  if (stories.length === 0) return null;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3">
      {stories.map((tile, i) => (
        <Link
          key={`${tile.href}-${i}`}
          href={tile.href}
          className="group relative min-h-[460px] overflow-hidden bg-surface-container md:min-h-[560px]"
        >
          <Image
            src={tile.image}
            alt=""
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            sizes="(min-width: 768px) 33vw, 100vw"
            unoptimized={tile.image.startsWith("http")}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-black/35 via-transparent to-brand-black/45" />
          <div className="absolute inset-x-0 top-0 p-8 text-brand-ivory">
            <h3 className="max-w-[12rem] text-[12px] font-medium uppercase leading-relaxed tracking-[0.28em]">
              {tile.title}
            </h3>
          </div>
          {tile.linkLabel ? (
            <span className="absolute bottom-8 left-8 text-[11px] uppercase tracking-[0.22em] text-brand-ivory">
              {tile.linkLabel} <span aria-hidden>→</span>
            </span>
          ) : tile.subtitle ? (
            <span className="absolute bottom-8 left-8 text-[11px] uppercase tracking-[0.22em] text-brand-ivory">
              {tile.subtitle}
            </span>
          ) : null}
        </Link>
      ))}
    </section>
  );
}
