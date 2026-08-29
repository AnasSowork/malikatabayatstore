/**
 * Sendit shipping types.
 * External provider strings must be normalized before leaving the adapter.
 */

export type ShippingProviderId = "sendit";

/** Normalized carrier-facing shipment state (not Prisma OrderStatus). */
export type ShippingStatus =
  | "PENDING"
  | "CREATED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED_DELIVERY"
  | "RETURNED"
  | "CANCELLED"
  | "UNKNOWN";

export type CreateShipmentInput = {
  orderId: string;
  customerName: string;
  phone: string;
  city: string;
  streetAddress: string;
  quantity: number;
  totalPrice: number;
  description: string;
  comment?: string | null;
  noOpen?: boolean;
  productName?: string | null;
};

export type CreateShipmentResult = {
  providerId: ShippingProviderId;
  trackingId: string;
  normalizedStatus: ShippingStatus;
  /** Raw provider status if known at create time */
  rawStatus?: string | null;
};

export type ShipmentStatusResult = {
  providerId: ShippingProviderId;
  trackingId: string;
  normalizedStatus: ShippingStatus;
  rawStatus: string;
  rawLabel?: string | null;
};

export type ShippingProvider = {
  readonly id: ShippingProviderId;
  isConfigured(): boolean;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  getShipmentStatus(trackingId: string): Promise<ShipmentStatusResult>;
  cancelShipment?(trackingId: string): Promise<void>;
};
