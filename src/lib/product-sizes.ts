export const PRODUCT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

export const DEFAULT_PRODUCT_SIZE: ProductSize = "M";

export const PRODUCT_SIZE_SET = new Set<string>(PRODUCT_SIZES);

/** Map legacy size labels to the current catalog. */
const LEGACY_SIZE_MAP: Record<string, ProductSize> = {
  XXL: "2XL",
  XXXL: "3XL",
  "4X": "4XL",
};

export function normalizeProductSize(size: string): string {
  const trimmed = size.trim().toUpperCase();
  return LEGACY_SIZE_MAP[trimmed] ?? trimmed;
}

export function isValidProductSize(size: string): size is ProductSize {
  return PRODUCT_SIZE_SET.has(normalizeProductSize(size));
}

export function normalizeAvailableSizes(sizes: string[]): string[] {
  if (sizes.length === 0) return [...PRODUCT_SIZES];

  const known = new Set(
    sizes
      .map(normalizeProductSize)
      .filter((value) => PRODUCT_SIZE_SET.has(value)),
  );

  if (known.size === 0) return [...PRODUCT_SIZES];

  // Products that previously offered the full catalog should also get 4XL.
  const hadFullLegacyCatalog = ["S", "M", "L", "XL", "2XL", "3XL"].every((size) =>
    known.has(size),
  );
  if (hadFullLegacyCatalog) return [...PRODUCT_SIZES];

  return PRODUCT_SIZES.filter((size) => known.has(size));
}
