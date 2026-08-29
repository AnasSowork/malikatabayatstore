import type { OrderStatus } from "@prisma/client";
import type { ShippingProviderId } from "@/lib/shipping/types";

export type OrderTrackingFields = {
  shippingProvider?: string | null;
  shippingTrackingId?: string | null;
  status?: OrderStatus;
};

export function getStoredShippingTrackingId(order: OrderTrackingFields): string | null {
  return order.shippingTrackingId?.trim() || null;
}

export function resolveOrderShippingProviderId(
  order: OrderTrackingFields,
): ShippingProviderId | null {
  if (getStoredShippingTrackingId(order)) return "sendit";
  return order.shippingProvider?.trim().toLowerCase() === "sendit" ? "sendit" : null;
}
