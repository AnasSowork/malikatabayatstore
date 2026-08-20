import type { OrderStatus } from "@prisma/client";
import { parseShippingProviderId } from "@/lib/shipping/provider";
import type { ShippingProviderId } from "@/lib/shipping/types";

export type OrderTrackingFields = {
  shippingProvider?: string | null;
  shippingTrackingId?: string | null;
  olivraisonTrackingId?: string | null;
  status?: OrderStatus;
};

/** Dual-read: generic field first, then legacy Olivraison column. */
export function getStoredShippingTrackingId(order: OrderTrackingFields): string | null {
  const generic = order.shippingTrackingId?.trim();
  if (generic) return generic;
  return order.olivraisonTrackingId?.trim() || null;
}

export function resolveOrderShippingProviderId(
  order: OrderTrackingFields,
): ShippingProviderId | null {
  const parsed = parseShippingProviderId(order.shippingProvider);
  if (parsed) return parsed;
  if (order.olivraisonTrackingId?.trim()) return "olivraison";
  return null;
}
