import type {
  CreateShipmentInput,
  CreateShipmentResult,
  ShipmentStatusResult,
  ShippingProvider,
  ShippingStatus,
} from "@/lib/shipping/types";
import {
  isSenditConfigured,
  senditRequest,
  SenditApiError,
} from "@/lib/shipping/providers/sendit-client";
import {
  getSenditPickupDistrictId,
  resolveSenditDistrictId,
  SenditCityMappingError,
} from "@/lib/shipping/providers/sendit-cities";

export class SenditValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SenditValidationError";
    this.code = code;
  }
}

type SenditColisPayload = {
  pickup_district_id: number;
  district_id: number;
  name: string;
  amount: number;
  address: string;
  phone: string;
  comment?: string;
  reference?: string;
  allow_open: number;
  allow_try: number;
  products_from_stock: number;
  products?: string;
  option_exchange: number;
};

type CreateDeliveryResponse = {
  success?: boolean;
  message?: string;
  data?: {
    code?: string;
    status?: string;
  };
};

type GetDeliveryResponse = {
  success?: boolean;
  data?: {
    code?: string;
    status?: string;
    status_return?: string | null;
  };
};

/**
 * Map documented Sendit parcel `status` (+ optional status_return) → ShippingStatus.
 * Source: OpenAPI Colis.status / Colis.status_return descriptions.
 */
export function normalizeSenditStatus(
  rawStatus: string | null | undefined,
  statusReturn?: string | null,
): ShippingStatus {
  const key = (rawStatus ?? "").trim().toUpperCase();
  const ret = (statusReturn ?? "").trim().toUpperCase();

  // Return pipeline is terminal for business RETURNED once seller-facing return progresses.
  if (
    ret === "RETURN_SELLER" ||
    ret === "RETURN_STOCK" ||
    ret === "RETURN_WAREHOUSE" ||
    ret === "RETURN_TOCHECK" ||
    ret === "TORETURN" ||
    ret === "RETOUR_PENDING"
  ) {
    // Only treat as RETURNED when delivery itself failed (cancel/reject) or return in progress.
    if (
      key === "CANCELED" ||
      key === "CANCELLED" ||
      key === "REJECTED" ||
      ret === "RETURN_SELLER" ||
      ret === "RETURN_STOCK"
    ) {
      return "RETURNED";
    }
  }

  switch (key) {
    case "PENDING":
    case "TO_PREPARE":
    case "NEW_DESTINATION":
      return "CREATED";
    case "TO_PICKUP":
    case "PICKEDUP":
    case "WAREHOUSE":
    case "TRANSIT":
    case "DISTRIBUTED":
    case "DELIVERING":
    case "SCHEDULED":
      return "IN_TRANSIT";
    case "UNREACHABLE":
    case "POSTPONED":
      // Non-terminal per OpenAPI — do not map to CANCELLED.
      return "FAILED_DELIVERY";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELED":
    case "CANCELLED":
      return "CANCELLED";
    case "REJECTED":
      return "RETURNED";
    default:
      return "UNKNOWN";
  }
}

export function mapOrderToSenditShipment(
  input: CreateShipmentInput,
  districtId: number,
): SenditColisPayload {
  const amount = Number(input.totalPrice);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new SenditValidationError("SENDIT_INVALID_AMOUNT", "Invalid COD amount.");
  }

  const address = input.streetAddress.trim();
  if (address.length < 3) {
    throw new SenditValidationError("SENDIT_MISSING_ADDRESS", "Street address is required.");
  }

  const phone = input.phone.trim();
  if (phone.length < 9) {
    throw new SenditValidationError("SENDIT_MISSING_PHONE", "Phone number is required.");
  }

  const name = input.customerName.trim();
  if (name.length < 3) {
    throw new SenditValidationError("SENDIT_MISSING_NAME", "Customer name is required.");
  }

  const products =
    input.productName?.trim() && input.quantity > 0
      ? `${input.productName.trim()} x${input.quantity}`
      : input.description.trim() || undefined;

  const payload: SenditColisPayload = {
    pickup_district_id: getSenditPickupDistrictId(),
    district_id: districtId,
    name,
    amount,
    address,
    phone,
    reference: input.orderId,
    allow_open: input.noOpen ? 0 : 1,
    allow_try: 0,
    products_from_stock: 0,
    option_exchange: 0,
  };

  const commentParts = [input.comment?.trim(), input.description?.trim()].filter(Boolean);
  if (commentParts.length) {
    payload.comment = commentParts.join(" — ").slice(0, 500);
  }
  if (products) {
    payload.products = products.slice(0, 500);
  }

  return payload;
}

export const senditShippingProvider: ShippingProvider = {
  id: "sendit",

  isConfigured() {
    return isSenditConfigured();
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    try {
      const district = await resolveSenditDistrictId(input.city);
      const body = mapOrderToSenditShipment(input, district.id);

      const response = await senditRequest<CreateDeliveryResponse>("/deliveries", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const code = response.data?.code?.trim();
      if (!code) {
        throw new SenditApiError(
          "Sendit did not return a parcel code.",
          502,
          "SENDIT_MISSING_CODE",
        );
      }

      const rawStatus = response.data?.status?.trim() || "PENDING";
      return {
        providerId: "sendit",
        trackingId: code,
        rawStatus,
        normalizedStatus: normalizeSenditStatus(rawStatus),
      };
    } catch (error) {
      if (error instanceof SenditCityMappingError) {
        throw new SenditValidationError(error.code, error.message);
      }
      throw error;
    }
  },

  async getShipmentStatus(trackingId: string): Promise<ShipmentStatusResult> {
    const code = trackingId.trim();
    const response = await senditRequest<GetDeliveryResponse>(
      `/deliveries/${encodeURIComponent(code)}`,
    );
    const rawStatus = response.data?.status?.trim() || "UNKNOWN";
    const statusReturn = response.data?.status_return ?? null;
    return {
      providerId: "sendit",
      trackingId: response.data?.code?.trim() || code,
      rawStatus,
      rawLabel: statusReturn,
      normalizedStatus: normalizeSenditStatus(rawStatus, statusReturn),
    };
  },

  async cancelShipment(trackingId: string): Promise<void> {
    // OpenAPI: DELETE /deliveries/{code} — "Supprimer un colis"
    await senditRequest(`/deliveries/${encodeURIComponent(trackingId.trim())}`, {
      method: "DELETE",
    });
  },
};
