import {
  getShippingProviderById,
  ShippingNotConfiguredError,
} from "@/lib/shipping/provider";
import type { ShipmentStatusResult } from "@/lib/shipping/types";
import {
  getStoredShippingTrackingId,
  resolveOrderShippingProviderId,
  type OrderTrackingFields,
} from "@/lib/shipping/tracking";

/**
 * Fetch normalized status from the order's provider (not always the active default).
 * Does NOT mutate Order or emit Meta events.
 */
export async function getShipmentStatusForOrder(
  order: OrderTrackingFields,
): Promise<ShipmentStatusResult | null> {
  const trackingId = getStoredShippingTrackingId(order);
  if (!trackingId) return null;

  const providerId = resolveOrderShippingProviderId(order);
  if (!providerId) return null;

  const provider = getShippingProviderById(providerId);
  if (!provider.isConfigured()) {
    throw new ShippingNotConfiguredError(
      `Shipping provider "${provider.id}" is not configured.`,
    );
  }
  return provider.getShipmentStatus(trackingId);
}
