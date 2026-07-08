"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import type { ProductColorVariant } from "@/lib/product-serialize";
import type { BundleOffer } from "@/lib/bundle-offers";
import type { AppLocale } from "@/lib/product-i18n";
import { formatMad } from "@/lib/format-price";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { ProductPurchasePanel } from "@/components/ProductPurchasePanel";

type Props = {
  productId: string;
  unitPrice: number;
  images: string[];
  productName: string;
  description: string;
  editionLine: string;
  colorVariants: ProductColorVariant[];
  bundleOffers: BundleOffer[];
};

export function ProductDetailExperience({
  productId,
  unitPrice,
  images,
  productName,
  description,
  editionLine,
  colorVariants,
  bundleOffers,
}: Props) {
  const locale = useLocale() as AppLocale;
  const [imageIndex, setImageIndex] = useState(0);
  const [galleryColor, setGalleryColor] = useState<string | null>(
    colorVariants[0]?.name ?? null,
  );

  const syncColorToImage = useCallback(
    (colorName: string) => {
      setGalleryColor(colorName);
      const colorIdx = colorVariants.findIndex((v) => v.name === colorName);
      if (colorIdx >= 0 && colorIdx < images.length) {
        setImageIndex(colorIdx);
      }
    },
    [colorVariants, images.length],
  );

  const syncImageToColor = useCallback(
    (idx: number) => {
      setImageIndex(idx);
      const variant = colorVariants[idx];
      if (variant) setGalleryColor(variant.name);
    },
    [colorVariants],
  );

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-20">
      <section className="relative w-full min-w-0 lg:sticky lg:top-24 lg:self-start">
        <ProductImageCarousel
          images={images}
          alt={productName}
          activeIndex={imageIndex}
          onIndexChange={syncImageToColor}
        />
      </section>

      <section className="flex min-w-0 flex-col gap-10">
        <div className="space-y-4">
          <span className="brand-eyebrow">{editionLine}</span>
          <h1 className="font-headline text-4xl font-medium tracking-tight text-on-surface md:text-5xl lg:text-6xl">
            {productName}
          </h1>
          <p className="font-headline text-2xl italic brand-gold-text md:text-3xl">
            {formatMad(unitPrice.toString(), locale)}
          </p>
          <p className="font-store max-w-xl text-base leading-relaxed text-on-surface/70 md:text-lg">
            {description}
          </p>
        </div>

        <ProductPurchasePanel
          productId={productId}
          unitPrice={unitPrice}
          colorVariants={colorVariants}
          bundleOffers={bundleOffers}
          preferredColor={galleryColor}
          onColorChange={syncColorToImage}
        />
      </section>
    </div>
  );
}
