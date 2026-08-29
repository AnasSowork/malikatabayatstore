import type { ShippingProvider, ShippingProviderId } from "@/lib/shipping/types";
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

const SENDIT_PROVIDER: ShippingProvider = senditShippingProvider;

/** Active provider — Sendit only. */
export function getConfiguredShippingProviderId(): ShippingProviderId {
  const raw = (process.env.SHIPPING_PROVIDER ?? "sendit").trim().toLowerCase();
  if (raw !== "sendit") {
    throw new ShippingConfigError(
      `Unsupported SHIPPING_PROVIDER="${raw}". Only sendit is supported.`,
    );
  }
  return "sendit";
}

export function getActiveShippingProvider(): ShippingProvider {
  getConfiguredShippingProviderId();
  return SENDIT_PROVIDER;
}

export function getShippingProviderById(id: ShippingProviderId): ShippingProvider {
  if (id !== "sendit") {
    throw new ShippingConfigError(`Unsupported shipping provider "${id}".`);
  }
  return SENDIT_PROVIDER;
}

export function listSupportedShippingProviders(): ShippingProviderId[] {
  return ["sendit"];
}

export function parseShippingProviderId(value: string | null | undefined): ShippingProviderId | null {
  return value?.trim().toLowerCase() === "sendit" ? "sendit" : null;
}
