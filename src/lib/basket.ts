import { findBundleOffer, type BundleOffer } from "@/lib/bundle-offers";

export const BASKET_MAX_QUANTITY = 20;
export const BASKET_MAX_LINES = 12;

export type BasketLineInput = {
  productId: string;
  quantity: number;
  size: string;
  color: string | null;
};

export type CartItem = BasketLineInput & {
  id: string;
  name: string;
  nameFr: string | null;
  image: string;
  unitPrice: number;
  bundleOffers: BundleOffer[];
  deliveryFee: number;
  maxQuantity: number;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function maxBasketQuantity(stockQuantity: number | null | undefined): number {
  if (stockQuantity == null) return BASKET_MAX_QUANTITY;
  return Math.min(BASKET_MAX_QUANTITY, Math.max(0, Math.floor(stockQuantity)));
}

export function basketLineId(input: Pick<BasketLineInput, "productId" | "size" | "color">): string {
  return `${input.productId}|${input.size}|${input.color ?? ""}`;
}

/** Bundle price when that quantity has one, otherwise the unit price times the quantity. */
export function priceForQuantity(unitPrice: number, offers: BundleOffer[], quantity: number): number {
  const bundle = findBundleOffer(offers, quantity);
  return roundMoney(bundle ? bundle.price : unitPrice * quantity);
}

export function lineMerchandise(item: Pick<CartItem, "unitPrice" | "bundleOffers" | "quantity">): number {
  return priceForQuantity(item.unitPrice, item.bundleOffers, item.quantity);
}

export function basketTotals(items: Pick<CartItem, "productId" | "unitPrice" | "bundleOffers" | "quantity" | "deliveryFee">[]) {
  let merchandise = 0;
  const deliveryByProduct = new Map<string, number>();
  for (const item of items) {
    merchandise += lineMerchandise(item);
    if (!deliveryByProduct.has(item.productId)) {
      deliveryByProduct.set(item.productId, item.deliveryFee);
    }
  }
  const delivery = [...deliveryByProduct.values()].reduce((sum, fee) => sum + fee, 0);
  return {
    merchandise: roundMoney(merchandise),
    delivery: roundMoney(delivery),
    total: roundMoney(merchandise + delivery),
  };
}
