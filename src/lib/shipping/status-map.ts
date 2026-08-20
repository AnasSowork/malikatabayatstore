import type { OrderStatus } from "@prisma/client";
import type { ShippingStatus } from "@/lib/shipping/types";

/**
 * Suggest a business OrderStatus from normalized shipping state.
 * Callers MUST apply via central order update + scheduleOrderStatusTransition.
 * Never call Meta from here.
 *
 * Non-terminal carrier states (FAILED_DELIVERY / UNKNOWN / PENDING) → null
 * so we do not flip local orders on unreachable/postponed alone.
 */
export function suggestedOrderStatusFromShipping(
  status: ShippingStatus,
): OrderStatus | null {
  switch (status) {
    case "CREATED":
    case "IN_TRANSIT":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "RETURNED":
      return "RETURNED";
    case "CANCELLED":
      return "CANCELLED";
    case "FAILED_DELIVERY":
    case "PENDING":
    case "UNKNOWN":
    default:
      return null;
  }
}
