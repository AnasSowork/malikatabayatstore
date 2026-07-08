import type { Product } from "@prisma/client";

import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";
import { toBundleOffers, type BundleOffer } from "@/lib/bundle-offers";

export type ProductColorVariant = {
  name: string;
  hex: string | null;
};

export type ProductForClient = {
  id: string;
  name: string;
  nameAr: string | null;
  nameFr: string | null;
  price: string;
  description: string;
  descriptionAr: string | null;
  descriptionFr: string | null;
  categories: string[];
  images: string[];
  colorVariants: ProductColorVariant[];
  bundleOffers: BundleOffer[];
  createdAt: string;
};

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function toColorVariants(value: unknown): ProductColorVariant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is { name: string; hex?: string | null } =>
        Boolean(v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string"),
    )
    .map((v) => ({
      name: v.name,
      hex: typeof v.hex === "string" ? v.hex : null,
    }));
}

export function serializeProduct(p: Product): ProductForClient {
  const categories = toStringArray(p.categories);
  const images = toStringArray(p.images).map((u) => normalizeProductImageSrc(u));
  const basePrice = Number(p.price.toString());

  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    nameFr: p.nameFr,
    price: p.price.toString(),
    description: p.description,
    descriptionAr: p.descriptionAr,
    descriptionFr: p.descriptionFr,
    categories,
    images,
    colorVariants: toColorVariants(p.colorVariants),
    bundleOffers: toBundleOffers(p.bundleOffers, basePrice),
    createdAt: p.createdAt.toISOString(),
  };
}
