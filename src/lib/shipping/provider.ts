import type { ShippingProvider, ShippingProviderId } from "@/lib/shipping/types";
import { olivraisonShippingProvider } from "@/lib/shipping/providers/olivraison";
import { senditShippingProvider } from "@/lib/shipping/providers/sendit";

export class ShippingConfigError extends Error {
  readonly code = "UNSUPPORTED_SHIPPING_PROVIDER";

  constructor(message: string) {
    super(message);
    this.name = "ShippingConfigError";
  }
}

export class ShippingNotConfiguredError extends Error {
  readonly code = "SHIPPING_NOT_CONFIGURED";

  constructor(message: string) {
    super(message);
    this.name = "ShippingNotConfiguredError";
  }
}

export class ShippingAlreadyExistsError extends Error {
  readonly code = "SHIPMENT_ALREADY_EXISTS";
  readonly trackingId: string;

  constructor(trackingId: string, message?: string) {
    super(message ?? "Order already has a shipment tracking id.");
    this.name = "ShippingAlreadyExistsError";
    this.trackingId = trackingId;
  }
}

const PROVIDERS: Record<ShippingProviderId, ShippingProvider> = {
  sendit: senditShippingProvider,
  olivraison: olivraisonShippingProvider,
};

/**
 * Active provider from SHIPPING_PROVIDER (default: sendit).
 * Throws ShippingConfigError for unknown values — safe for admin ship routes only.
 */
export function getConfiguredShippingProviderId(): ShippingProviderId {
  const raw = (process.env.SHIPPING_PROVIDER ?? "sendit").trim().toLowerCase();
  if (raw === "sendit") return "sendit";
  if (raw === "olivraison") return "olivraison";
  throw new ShippingConfigError(
    `Unsupported SHIPPING_PROVIDER="${raw}". Supported: sendit, olivraison`,
  );
}

export function getActiveShippingProvider(): ShippingProvider {
  const id = getConfiguredShippingProviderId();
  return PROVIDERS[id];
}

export function getShippingProviderById(id: ShippingProviderId): ShippingProvider {
  return PROVIDERS[id];
}

export function listSupportedShippingProviders(): ShippingProviderId[] {
  return Object.keys(PROVIDERS) as ShippingProviderId[];
}

export function parseShippingProviderId(value: string | null | undefined): ShippingProviderId | null {
  const raw = value?.trim().toLowerCase();
  if (raw === "sendit" || raw === "olivraison") return raw;
  return null;
}
