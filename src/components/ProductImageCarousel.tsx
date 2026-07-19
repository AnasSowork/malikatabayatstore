"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";

type Props = {
  images: string[];
  alt: string;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
};

export function ProductImageCarousel({ images, alt, activeIndex, onIndexChange }: Props) {
  const safeImages = images.length > 0 ? images : ["https://via.placeholder.com/960x1200?text=No+Image"];
  const [internalIndex, setInternalIndex] = useState(0);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const index = activeIndex ?? internalIndex;
  const setIndex = useCallback(
    (next: number | ((v: number) => number)) => {
      const resolved = typeof next === "function" ? next(index) : next;
      const clamped = ((resolved % safeImages.length) + safeImages.length) % safeImages.length;
      if (onIndexChange) onIndexChange(clamped);
      else setInternalIndex(clamped);
    },
    [index, onIndexChange, safeImages.length],
  );

  useEffect(() => {
    const strip = thumbStripRef.current;
    const active = strip?.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`);
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  function next() {
    setIndex((v) => v + 1);
  }

  function prev() {
    setIndex((v) => v - 1);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 48) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
  }

  const counter = String(index + 1).padStart(2, "0");
  const total = String(safeImages.length).padStart(2, "0");
  const currentSrc = safeImages[index]!;

  return (
    <div className="product-gallery">
      <div className="product-gallery-stage">
      <div
        className="product-gallery-main"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") prev();
          if (event.key === "ArrowRight") next();
        }}
        tabIndex={0}
      >
        <ProductImage
          key={currentSrc}
          src={currentSrc}
          alt={`${alt} ${index + 1}`}
          width={960}
          height={1200}
          priority={index === 0}
          className="product-gallery-image"
        />

        {safeImages.length > 1 ? (
          <>
            <div
              className="absolute left-4 top-4 z-10 flex items-baseline gap-0.5 rounded-full bg-black/70 px-3 py-1.5 font-store text-xs font-semibold text-white backdrop-blur-sm"
              aria-live="polite"
            >
              <span className="text-sm">{counter}</span>
              <span className="opacity-50">/</span>
              <span>{total}</span>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-white/20">
              <span
                className="block h-full bg-white transition-all duration-300"
                style={{ width: `${((index + 1) / safeImages.length) * 100}%` }}
              />
            </div>
          </>
        ) : null}
      </div>

      {safeImages.length > 1 ? (
        <button
          type="button"
          className="product-gallery-companion"
          onClick={() => setIndex(index + 1)}
          aria-label={`View image ${((index + 1) % safeImages.length) + 1}`}
        >
          <ProductImage
            src={safeImages[(index + 1) % safeImages.length]!}
            alt={`${alt} ${((index + 1) % safeImages.length) + 1}`}
            width={960}
            height={1200}
            className="product-gallery-image"
          />
        </button>
      ) : null}
      </div>

      {safeImages.length > 1 ? (
        <div className="product-gallery-thumbs">
          <div
            ref={thumbStripRef}
            className="product-gallery-thumb-rail"
          >
            {safeImages.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                type="button"
                data-thumb-index={idx}
                onClick={() => setIndex(idx)}
                aria-label={`View image ${idx + 1}`}
                aria-current={idx === index ? "true" : undefined}
                className={`product-gallery-thumb ${
                  idx === index
                    ? "border-brand-black opacity-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]"
                    : "border-transparent opacity-70 hover:opacity-90"
                }`}
              >
                <ProductImage src={img} alt="" width={120} height={150} className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded-full bg-black/65 px-1.5 py-0.5 font-store text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
