"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ProductColorVariant } from "@/lib/product-serialize";
import type { BundleOffer } from "@/lib/bundle-offers";
import type { AppLocale } from "@/lib/product-i18n";
import { MadPrice } from "@/components/MadPrice";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { ProductPurchasePanel } from "@/components/ProductPurchasePanel";
import { CustomerReviewsSection } from "@/components/CustomerReviewsSection";
import { ProductAssuranceSections } from "@/components/ProductAssuranceSections";
import { ProductRatingBadge } from "@/components/ProductRatingBadge";
import { MaterialIcon } from "@/components/MaterialIcon";
import { Link } from "@/i18n/navigation";
import {
  localizeProductText,
  type ProductDetailContent,
} from "@/lib/product-detail-content";
import { trackViewContent } from "@/lib/meta-pixel-events";

type Props = {
  productId: string;
  unitPrice: number;
  images: string[];
  productName: string;
  description: string;
  editionLine: string;
  colorVariants: ProductColorVariant[];
  bundleOffers: BundleOffer[];
  category: string;
  compareAtPrice: number | null;
  sku: string | null;
  stockQuantity: number | null;
  soldCount: number;
  rating: number | null;
  reviewCount: number;
  availableSizes: string[];
  detailContent: ProductDetailContent;
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
  category,
  compareAtPrice,
  stockQuantity,
  soldCount,
  rating,
  reviewCount,
  availableSizes,
  detailContent,
}: Props) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("product");
  const [imageIndex, setImageIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [galleryColor, setGalleryColor] = useState<string | null>(
    colorVariants[0]?.name ?? null,
  );

  useEffect(() => {
    trackViewContent({
      productId,
      productName,
      value: unitPrice,
    });
  }, [productId, productName, unitPrice]);

  const syncColorToImage = useCallback(
    (colorName: string) => {
      setGalleryColor(colorName);
      const variant = colorVariants.find((item) => item.name === colorName);
      if (variant?.imageUrl) {
        const byUrl = images.findIndex((image) => image === variant.imageUrl);
        if (byUrl >= 0) {
          setImageIndex(byUrl);
          return;
        }
      }
      const colorIdx = colorVariants.findIndex((item) => item.name === colorName);
      if (colorIdx >= 0 && colorIdx < images.length) {
        setImageIndex(colorIdx);
      }
    },
    [colorVariants, images],
  );

  const syncImageToColor = useCallback(
    (idx: number) => {
      setImageIndex(idx);
      const image = images[idx];
      const linked = image
        ? colorVariants.find((variant) => variant.imageUrl === image)
        : undefined;
      if (linked) {
        setGalleryColor(linked.name);
        return;
      }
      const variant = colorVariants[idx];
      if (variant) setGalleryColor(variant.name);
    },
    [colorVariants, images],
  );
  const inStock = stockQuantity == null || stockQuantity > 0;

  return (
    <div className="product-detail-shell">
      <nav className="product-breadcrumb" aria-label={t("breadcrumbLabel")}>
        <Link href="/">{t("breadcrumbHome")}</Link>
        <MaterialIcon name="chevron_left" className="!text-base" />
        <Link href="/products">{t("breadcrumbProducts")}</Link>
        <MaterialIcon name="chevron_left" className="!text-base" />
        <span>{category}</span>
      </nav>

      <div className="grid min-w-0 grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(24rem,0.82fr)] lg:gap-14 xl:gap-20">
      <section className="relative w-full min-w-0 lg:sticky lg:top-24 lg:self-start">
        <ProductImageCarousel
          images={images}
          alt={productName}
          activeIndex={imageIndex}
          onIndexChange={syncImageToColor}
        />
      </section>

      <section className="product-info-column">
        <div className="product-summary">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="brand-eyebrow">{editionLine}</span>
              <h1>{productName}</h1>
            </div>
            <button
              type="button"
              className={`product-favorite ${favorite ? "product-favorite-active" : ""}`}
              aria-label={favorite ? t("removeFavorite") : t("addFavorite")}
              aria-pressed={favorite}
              onClick={() => setFavorite((current) => !current)}
            >
              <MaterialIcon name={favorite ? "favorite" : "favorite_border"} />
            </button>
          </div>

          <ProductRatingBadge rating={rating} reviewCount={reviewCount} soldCount={soldCount} />

          <div className="product-price-row">
            <MadPrice amount={unitPrice} locale={locale} className="product-price-current" />
            {compareAtPrice ? (
              <del>
                <MadPrice amount={compareAtPrice} locale={locale} className="product-price-compare" />
              </del>
            ) : null}
          </div>

          <p className="product-short-description">
            {localizeProductText(detailContent.shortDescription, locale)}
          </p>
          <p className="product-full-description">{description}</p>

        </div>

        <ProductPurchasePanel
          productId={productId}
          unitPrice={unitPrice}
          colorVariants={colorVariants}
          bundleOffers={bundleOffers}
          availableSizes={availableSizes}
          inStock={inStock}
          preferredColor={galleryColor}
          onColorChange={syncColorToImage}
        />
        <CustomerReviewsSection />
        <ProductAssuranceSections content={detailContent} />
      </section>
      </div>
    </div>
  );
}
