import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export type OrderFilterKey =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export type OrderForStatus = {
  status: OrderStatus;
  streetAddress?: string | null;
  olivraisonTrackingId?: string | null;
};

export function parseOrderStatus(value: unknown): OrderStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return ORDER_STATUSES.includes(normalized as OrderStatus) ? (normalized as OrderStatus) : null;
}

export function orderStatusTone(status: OrderStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-900";
    case "CONFIRMED":
      return "bg-sky-100 text-sky-900";
    case "SHIPPED":
      return "bg-blue-100 text-blue-900";
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-900";
    case "CANCELLED":
      return "bg-red-100 text-red-900";
    case "RETURNED":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-black/5 text-on-surface-variant";
  }
}

export function isOrderShipped(order: Pick<OrderForStatus, "olivraisonTrackingId">): boolean {
  return Boolean(order.olivraisonTrackingId?.trim());
}

export function isShippingReady(order: Pick<OrderForStatus, "streetAddress">): boolean {
  return Boolean(order.streetAddress?.trim() && order.streetAddress.trim().length >= 3);
}

export function canSendToOlivraison(order: OrderForStatus): boolean {
  return (
    !isOrderShipped(order) &&
    isShippingReady(order) &&
    order.status !== "CANCELLED" &&
    order.status !== "RETURNED" &&
    order.status !== "DELIVERED"
  );
}

export function matchesOrderFilter(order: OrderForStatus, filter: OrderFilterKey): boolean {
  if (filter === "ALL") return true;
  if (filter === "READY_TO_SHIP") {
    return (
      (order.status === "CONFIRMED" || order.status === "PENDING") &&
      isShippingReady(order) &&
      !isOrderShipped(order)
    );
  }
  if (filter === "SHIPPED") {
    return order.status === "SHIPPED" || isOrderShipped(order);
  }
  return order.status === filter;
}
