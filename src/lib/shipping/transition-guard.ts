import type { OrderStatus } from "@prisma/client";

/**
 * Guard for automatic shipping-driven OrderStatus changes
 * (webhooks / syncShipmentStatus). Admin PATCH remains unrestricted.
 */
export function isAllowedAutomaticShippingTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return false;

  if (from === "SHIPPED") {
    return to === "DELIVERED" || to === "RETURNED" || to === "CANCELLED";
  }

  // Tracking exists but local status lagged (edge recovery).
  if (from === "CONFIRMED" && to === "SHIPPED") {
    return true;
  }

  // Delivered then returned to seller.
  if (from === "DELIVERED" && to === "RETURNED") {
    return true;
  }

  // Reject regressions: DELIVERED → SHIPPED, RETURNED → IN_TRANSIT, etc.
  return false;
}
