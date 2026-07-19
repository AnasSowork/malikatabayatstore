import type { Product } from "@prisma/client";

import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";
import { toBundleOffers, type BundleOffer } from "@/lib/bundle-offers";
import {
  normalizeProductDetailContent,
  type ProductDetailContent,
} from "@/lib/product-detail-content";
import { normalizeAvailableSizes } from "@/lib/product-sizes";

export type ProductColorVariant = {
  name: string;
  hex: string | null;
  imageUrl: string | null;
};

export type ProductForClient = {
  id: string;
  name: string;
  nameAr: string | null;
  nameFr: string | null;
  price: string;
  compareAtPrice: string | null;
  sku: string | null;
  stockQuantity: number | null;
  soldCount: number;
  rating: number | null;
  reviewCount: number;
  description: string;
  descriptionAr: string | null;
  descriptionFr: string | null;
  categories: string[];
  images: string[];
  colorVariants: ProductColorVariant[];
  bundleOffers: BundleOffer[];
  availableSizes: string[];
  detailContent: ProductDetailContent;
  createdAt: string;
  updatedAt: string;
};

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function toColorVariants(value: unknown): ProductColorVariant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is { name: string; hex?: string | null; imageUrl?: string | null } =>
        Boolean(v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string"),
    )
    .map((v) => ({
      name: v.name,
      hex: typeof v.hex === "string" ? v.hex : null,
      imageUrl:
        typeof v.imageUrl === "string" && v.imageUrl.trim()
          ? normalizeProductImageSrc(v.imageUrl)
          : null,
    }));
}

export function serializeProduct(p: Product): ProductForClient {
  const categories = toStringArray(p.categories);
  const images = toStringArray(p.images).map((u) => normalizeProductImageSrc(u));
  const basePrice = Number(p.price.toString());
  const colorVariants = toColorVariants(p.colorVariants).map((variant, index) => ({
    ...variant,
    // Default mapping: color order follows gallery order until an explicit photo is set.
    imageUrl: variant.imageUrl ?? images[index] ?? null,
  }));

  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    nameFr: p.nameFr,
    price: p.price.toString(),
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
    sku: p.sku,
    stockQuantity: p.stockQuantity,
    soldCount: p.soldCount,
    rating: p.rating == null ? null : Number(p.rating.toString()),
    reviewCount: p.reviewCount,
    description: p.description,
    descriptionAr: p.descriptionAr,
    descriptionFr: p.descriptionFr,
    categories,
    images,
    colorVariants,
    bundleOffers: toBundleOffers(p.bundleOffers, basePrice),
    availableSizes: normalizeAvailableSizes(toStringArray(p.availableSizes)),
    detailContent: normalizeProductDetailContent(p.detailContent),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
