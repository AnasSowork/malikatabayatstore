export type BundleOffer = {
  quantity: number;
  price: number;
  /** The single offer shown on the product page. */
  featured?: boolean;
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
      (v): v is { quantity: number; price: number; featured?: boolean } =>
        Boolean(
          v &&
            typeof v === "object" &&
            typeof (v as { quantity?: unknown }).quantity === "number" &&
            typeof (v as { price?: unknown }).price === "number" &&
            (v as { quantity: number }).quantity >= 1 &&
            (v as { price: number }).price >= 0,
        ),
    )
    .map((v) => ({
      quantity: Math.floor(v.quantity),
      price: v.price,
      featured: v.featured === true,
    }))
    .sort((a, b) => a.quantity - b.quantity);

  if (parsed.length === 0) {
    return [{ quantity: 1, price: basePrice }];
  }

  if (!parsed.some((o) => o.quantity === 1)) {
    parsed.unshift({
      quantity: 1,
      price: basePrice,
      featured: !parsed.some((o) => o.featured),
    });
  }

  return parsed;
}

export function buildBundleOffersFromPrices(
  price1: number,
  price2?: number | null,
  price3?: number | null,
  featuredQuantity = 1,
): BundleOffer[] {
  const offers: BundleOffer[] = [{ quantity: 1, price: price1 }];
  if (price2 != null && Number.isFinite(price2) && price2 > 0) {
    offers.push({ quantity: 2, price: price2 });
  }
  if (price3 != null && Number.isFinite(price3) && price3 > 0) {
    offers.push({ quantity: 3, price: price3 });
  }
  const featured = offers.some((offer) => offer.quantity === featuredQuantity)
    ? featuredQuantity
    : 1;
  return offers.map((offer) => ({ ...offer, featured: offer.quantity === featured }));
}

/** The one quantity offer shown on the product page. */
export function storefrontOffer(offers: BundleOffer[], unitPrice: number): BundleOffer {
  return (
    offers.find((offer) => offer.featured) ??
    offers.find((offer) => offer.quantity === 1) ??
    offers[0] ?? { quantity: 1, price: unitPrice }
  );
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
