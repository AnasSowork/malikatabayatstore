export const PRODUCT_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

export const DEFAULT_PRODUCT_SIZE: ProductSize = "M";

export const PRODUCT_SIZE_SET = new Set<string>(PRODUCT_SIZES);

export function isValidProductSize(size: string): size is ProductSize {
  return PRODUCT_SIZE_SET.has(size);
}
