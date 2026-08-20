export type {
  CreateShipmentInput,
  CreateShipmentResult,
  ShipmentStatusResult,
  ShippingProvider,
  ShippingProviderId,
  ShippingStatus,
} from "@/lib/shipping/types";

export {
  getActiveShippingProvider,
  getConfiguredShippingProviderId,
  getShippingProviderById,
  listSupportedShippingProviders,
  parseShippingProviderId,
  ShippingAlreadyExistsError,
  ShippingConfigError,
  ShippingNotConfiguredError,
} from "@/lib/shipping/provider";

export {
  createShipmentForOrder,
  getStoredShippingTrackingId,
  resolveOrderShippingProviderId,
  suggestedOrderStatusFromShipping,
} from "@/lib/shipping/service";

export { getShipmentStatusForOrder } from "@/lib/shipping/sync-read";
export {
  applyAuthoritativeShippingStatus,
  syncShipmentStatus,
  syncSenditOrderFromWebhookHints,
  type ShippingSyncResult,
} from "@/lib/shipping/sync";
export { isAllowedAutomaticShippingTransition } from "@/lib/shipping/transition-guard";
