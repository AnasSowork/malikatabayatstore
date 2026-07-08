export type BundleOffer = {
  quantity: number;
  price: number;
};

export type OrderLineItem = {
  size: string;
  color: string | null;
};

export function toBundleOffers(value: unknown, basePrice: number): BundleOffer[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ quantity: 1, price: basePrice }];
  }

  const parsed = value
    .filter(
      (v): v is { quantity: number; price: number } =>
        Boolean(
          v &&
            typeof v === "object" &&
            typeof (v as { quantity?: unknown }).quantity === "number" &&
            typeof (v as { price?: unknown }).price === "number" &&
            (v as { quantity: number }).quantity >= 1 &&
            (v as { price: number }).price >= 0,
        ),
    )
    .map((v) => ({ quantity: Math.floor(v.quantity), price: v.price }))
    .sort((a, b) => a.quantity - b.quantity);

  if (parsed.length === 0) {
    return [{ quantity: 1, price: basePrice }];
  }

  if (!parsed.some((o) => o.quantity === 1)) {
    parsed.unshift({ quantity: 1, price: basePrice });
  }

  return parsed;
}

export function buildBundleOffersFromPrices(
  price1: number,
  price2?: number | null,
  price3?: number | null,
): BundleOffer[] {
  const offers: BundleOffer[] = [{ quantity: 1, price: price1 }];
  if (price2 != null && Number.isFinite(price2) && price2 > 0) {
    offers.push({ quantity: 2, price: price2 });
  }
  if (price3 != null && Number.isFinite(price3) && price3 > 0) {
    offers.push({ quantity: 3, price: price3 });
  }
  return offers;
}

export function bundleSavings(offer: BundleOffer, unitPrice: number): number {
  return Math.max(0, unitPrice * offer.quantity - offer.price);
}

export function findBundleOffer(offers: BundleOffer[], quantity: number): BundleOffer | null {
  return offers.find((o) => o.quantity === quantity) ?? null;
}

export function toOrderLineItems(value: unknown): OrderLineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is { size: string; color?: string | null } =>
        Boolean(v && typeof v === "object" && typeof (v as { size?: unknown }).size === "string"),
    )
    .map((v) => ({
      size: v.size.trim(),
      color: typeof v.color === "string" && v.color.trim() ? v.color.trim() : null,
    }));
}

export function formatLineItemsSummary(items: OrderLineItem[]): string {
  return items
    .map((item, i) => {
      const parts = [`#${i + 1}: ${item.size}`];
      if (item.color) parts.push(item.color);
      return parts.join(" · ");
    })
    .join(" | ");
}
