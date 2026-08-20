import { isOlivraisonConfigured, olivraisonRequest } from "@/lib/olivraison";
import type { OlivraisonCreatePackage } from "@/lib/olivraison-types";
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  ShipmentStatusResult,
  ShippingProvider,
  ShippingStatus,
} from "@/lib/shipping/types";

type CreatePackageResponse = {
  trackingID?: string;
  data?: { trackingID?: string };
  status?: string;
};

type PackageStatusResponse = {
  trackingID?: string;
  status?: string;
  data?: { trackingID?: string; status?: string };
};

function extractTrackingId(response: CreatePackageResponse): string | null {
  return response.trackingID?.trim() || response.data?.trackingID?.trim() || null;
}

/**
 * Map Olivraison parcel status codes/labels to normalized ShippingStatus.
 * Keep all Olivraison-specific strings inside this adapter.
 */
export function normalizeOlivraisonStatus(rawStatus: string | null | undefined): ShippingStatus {
  const key = (rawStatus ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!key) return "UNKNOWN";

  switch (key) {
    case "NEW":
    case "PENDING":
    case "CREATED":
      return "CREATED";
    case "CONFIRMED":
    case "PICKUP":
    case "PICKEDUP":
    case "PICKED_UP":
    case "TRANSIT":
    case "IN_TRANSIT":
    case "RECIVED":
    case "RECEIVED":
    case "OUT_FOR_DELIVERY":
      return "IN_TRANSIT";
    case "DELIVERED":
    case "LIVRE":
    case "LIVRÉ":
    case "COLIS_LIVRE":
      return "DELIVERED";
    case "RETURNED":
    case "RETURN":
    case "RETOUR":
      return "RETURNED";
    case "CANCELED":
    case "CANCELLED":
    case "DELETED":
      return "CANCELLED";
    case "REFUSED":
    case "FAILED":
    case "FAILED_DELIVERY":
    case "NO_ANSWER":
    case "POSTPONED":
      return "FAILED_DELIVERY";
    default:
      return "UNKNOWN";
  }
}

function buildOlivraisonPayload(input: CreateShipmentInput): OlivraisonCreatePackage {
  const payload: OlivraisonCreatePackage = {
    price: input.totalPrice,
    description: input.description.trim(),
    orderId: input.orderId,
    destination: {
      name: input.customerName.trim(),
      phone: input.phone.trim(),
      city: input.city.trim(),
      streetAddress: input.streetAddress.trim(),
    },
  };
  if (input.comment?.trim()) {
    payload.comment = input.comment.trim();
  }
  if (input.noOpen) {
    payload.noOpen = true;
  }
  if (input.productName?.trim()) {
    payload.name = input.productName.trim().slice(0, 120);
  }
  return payload;
}

export const olivraisonShippingProvider: ShippingProvider = {
  id: "olivraison",

  isConfigured() {
    return isOlivraisonConfigured();
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const payload = buildOlivraisonPayload(input);
    const response = await olivraisonRequest<CreatePackageResponse>("/package/new", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const trackingId = extractTrackingId(response);
    if (!trackingId) {
      throw new Error("Olivraison did not return a tracking ID.");
    }

    const rawStatus = response.status?.trim() || "CREATED";
    const normalized = normalizeOlivraisonStatus(rawStatus);
    return {
      providerId: "olivraison",
      trackingId,
      rawStatus,
      normalizedStatus: normalized === "UNKNOWN" ? "CREATED" : normalized,
    };
  },

  async getShipmentStatus(trackingId: string): Promise<ShipmentStatusResult> {
    const id = trackingId.trim();
    const response = await olivraisonRequest<PackageStatusResponse>(
      `/package/${encodeURIComponent(id)}`,
    );
    const rawStatus =
      response.status?.trim() ||
      response.data?.status?.trim() ||
      "UNKNOWN";

    return {
      providerId: "olivraison",
      trackingId: response.trackingID?.trim() || response.data?.trackingID?.trim() || id,
      rawStatus,
      normalizedStatus: normalizeOlivraisonStatus(rawStatus),
    };
  },
};
