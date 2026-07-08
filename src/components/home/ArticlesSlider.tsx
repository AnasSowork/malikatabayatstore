"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

export type HomeArticle = {
  category: string;
  title: string;
  excerpt: string;
  image: string;
  href: string;
};

export function ArticlesSlider({
  eyebrow,
  title,
  readLabel,
  articles,
}: {
  eyebrow: string;
  title: string;
  readLabel: string;
  articles: HomeArticle[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = useCallback((dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-article-card]");
    const w = card?.offsetWidth ?? 320;
    const gap = 24;
    el.scrollBy({ left: dir * (w + gap), behavior: "smooth" });
  }, []);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-article-card]");
    const w = (card?.offsetWidth ?? 320) + 24;
    const i = Math.round(el.scrollLeft / Math.max(1, w));
    setIndex(Math.max(0, Math.min(articles.length - 1, i)));
  }, [articles.length]);

  return (
    <section className="border-y border-brand-gold/15 bg-brand-cream/50 py-20 md:py-28">
      <div className="mx-auto max-w-[1920px] px-6 md:px-24">
        <div className="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="brand-eyebrow mb-3 block">
              {eyebrow}
            </span>
            <h2 className="font-headline text-4xl text-on-surface md:text-5xl">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => scrollTo(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-gold/25 text-on-surface transition-colors hover:border-brand-gold hover:bg-brand-gold/10 hover:text-brand-gold-dark"
            >
              <span className="text-lg leading-none">←</span>
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => scrollTo(1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-gold/25 text-on-surface transition-colors hover:border-brand-gold hover:bg-brand-gold/10 hover:text-brand-gold-dark"
            >
              <span className="text-lg leading-none">→</span>
            </button>
          </div>
        </div>

        <div
          ref={scroller}
          onScroll={onScroll}
          className="-mx-2 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 scrollbar-thin md:mx-0 md:gap-8"
          style={{ scrollPaddingInline: "1rem" }}
        >
          {articles.map((a, i) => (
            <article
              key={a.href + i}
              data-article-card
              className="animate-home-article-in min-w-[min(100%,320px)] shrink-0 snap-center px-2 sm:min-w-[360px] md:min-w-[400px] md:px-0"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Link href={a.href} className="group block">
                <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-2xl bg-surface-container-low brand-card-glow ring-1 ring-brand-gold/10 transition-all duration-500 group-hover:ring-brand-gold/25 group-hover:shadow-[0_28px_60px_-20px_rgba(0,0,0,0.15)]">
                  <Image
                    src={a.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    sizes="(max-width:768px) 90vw, 400px"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-95" />
                  <span className="absolute left-5 top-5 rounded-full bg-brand-black/75 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-widest text-white ring-1 ring-white/25 backdrop-blur-sm">
                    {a.category}
                  </span>
                </div>
                <h3 className="mb-2 font-headline text-2xl text-on-surface transition-colors group-hover:brand-gold-text md:text-3xl">
                  {a.title}
                </h3>
                <p className="mb-4 line-clamp-2 font-sans text-sm leading-relaxed text-on-surface-variant">
                  {a.excerpt}
                </p>
                <span className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-brand-gold-dark underline decoration-brand-gold/30 underline-offset-8 transition-all group-hover:decoration-brand-gold">
                  {readLabel}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-2 md:mt-10">
          {articles.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => {
                const el = scroller.current;
                if (!el) return;
                const card = el.querySelector<HTMLElement>("[data-article-card]");
                const w = (card?.offsetWidth ?? 320) + 24;
                el.scrollTo({ left: i * w, behavior: "smooth" });
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-8 bg-brand-gold" : "w-1.5 bg-brand-gold/25 hover:bg-brand-gold/45"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
