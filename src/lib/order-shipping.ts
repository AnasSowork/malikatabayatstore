import type { OrderLineItem } from "@/lib/bundle-offers";
import { getLocalizedProductFields, type AppLocale } from "@/lib/product-i18n";
import type { OlivraisonCreatePackage } from "@/lib/olivraison-types";
import type { ProductForClient } from "@/lib/product-serialize";

export type OrderShippingSource = {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  quantity: number;
  totalPrice: string | number;
  lineItems: OrderLineItem[];
  streetAddress?: string | null;
  shippingComment?: string | null;
  shippingDescription?: string | null;
  shippingNoOpen?: boolean | null;
  product: ProductForClient;
};

function formatLineItems(items: OrderLineItem[]): string {
  if (!items.length) return "";
  return items
    .map((item) => {
      const color = item.color ? `/${item.color}` : "";
      return `${item.size}${color}`;
    })
    .join(", ");
}

export function buildDefaultShippingDescription(
  order: OrderShippingSource,
  locale: AppLocale = "fr",
): string {
  const { name } = getLocalizedProductFields(order.product, locale);
  const pieces = formatLineItems(order.lineItems);
  const suffix = pieces ? ` — ${pieces}` : "";
  return `${name} ×${order.quantity}${suffix}`.slice(0, 500);
}

export function validateOrderForShipping(order: OrderShippingSource): string | null {
  if (!order.customerName.trim() || order.customerName.trim().length < 3) {
    return "Customer name must be at least 3 characters.";
  }
  if (!order.phone.trim() || order.phone.trim().length < 9) {
    return "Phone number is required.";
  }
  if (!order.city.trim() || order.city.trim().length < 2) {
    return "City is required.";
  }
  const street = order.streetAddress?.trim() ?? "";
  if (street.length < 3) {
    return "Street address is required (min 3 characters).";
  }
  const description = (order.shippingDescription?.trim() ||
    buildDefaultShippingDescription(order)).trim();
  if (description.length < 3) {
    return "Package description is required.";
  }
  const price = Number(order.totalPrice);
  if (!Number.isFinite(price) || price < 0) {
    return "Invalid order amount.";
  }
  return null;
}

export function buildOlivraisonCreatePackage(order: OrderShippingSource): OlivraisonCreatePackage {
  const description =
    order.shippingDescription?.trim() || buildDefaultShippingDescription(order);
  const payload: OlivraisonCreatePackage = {
    price: Number(order.totalPrice),
    description,
    orderId: order.id,
    destination: {
      name: order.customerName.trim(),
      phone: order.phone.trim(),
      city: order.city.trim(),
      streetAddress: order.streetAddress!.trim(),
    },
  };
  if (order.shippingComment?.trim()) {
    payload.comment = order.shippingComment.trim();
  }
  if (order.shippingNoOpen) {
    payload.noOpen = true;
  }
  const { name } = getLocalizedProductFields(order.product, "fr");
  payload.name = name.slice(0, 120);
  return payload;
}
