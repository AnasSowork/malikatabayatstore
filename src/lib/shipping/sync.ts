import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { scheduleOrderStatusTransition } from "@/lib/order-lifecycle-analytics";
import {
  getShippingProviderById,
  ShippingNotConfiguredError,
} from "@/lib/shipping/provider";
import { suggestedOrderStatusFromShipping } from "@/lib/shipping/status-map";
import { isAllowedAutomaticShippingTransition } from "@/lib/shipping/transition-guard";
import type { ShipmentStatusResult } from "@/lib/shipping/types";
import {
  getStoredShippingTrackingId,
  resolveOrderShippingProviderId,
} from "@/lib/shipping/tracking";

export type ShippingSyncResult = {
  applied: boolean;
  fromStatus: OrderStatus;
  toStatus: OrderStatus | null;
  shipping: ShipmentStatusResult | null;
  reason?: string;
};

type OrderWithRelations = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

async function loadOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true, metaEventLogs: true },
  });
}

/**
 * Apply an already-fetched normalized shipping status to a local order
 * through the central lifecycle path. Never calls Meta directly.
 */
export async function applyAuthoritativeShippingStatus(input: {
  order: OrderWithRelations;
  shipping: ShipmentStatusResult;
}): Promise<ShippingSyncResult> {
  const { order, shipping } = input;
  const suggested = suggestedOrderStatusFromShipping(shipping.normalizedStatus);

  if (!suggested) {
    return {
      applied: false,
      fromStatus: order.status,
      toStatus: null,
      shipping,
      reason: "non_terminal_or_unknown_status",
    };
  }

  if (suggested === order.status) {
    return {
      applied: false,
      fromStatus: order.status,
      toStatus: suggested,
      shipping,
      reason: "already_current",
    };
  }

  if (!isAllowedAutomaticShippingTransition(order.status, suggested)) {
    return {
      applied: false,
      fromStatus: order.status,
      toStatus: suggested,
      shipping,
      reason: "transition_not_allowed",
    };
  }

  const previousStatus = order.status;
  const touched = await prisma.order.updateMany({
    where: {
      id: order.id,
      status: previousStatus,
    },
    data: {
      status: suggested,
      statusUpdatedAt: new Date(),
    },
  });

  if (touched.count === 0) {
    return {
      applied: false,
      fromStatus: previousStatus,
      toStatus: suggested,
      shipping,
      reason: "concurrent_or_stale_status",
    };
  }

  const updated = await loadOrder(order.id);
  if (!updated) {
    return {
      applied: false,
      fromStatus: previousStatus,
      toStatus: suggested,
      shipping,
      reason: "order_missing_after_update",
    };
  }

  scheduleOrderStatusTransition({
    order: updated,
    fromStatus: previousStatus,
    toStatus: suggested,
  });

  return {
    applied: true,
    fromStatus: previousStatus,
    toStatus: suggested,
    shipping,
  };
}

/**
 * Pull authoritative carrier status and apply allowed local transitions.
 * Sendit orders only for automatic application.
 */
export async function syncShipmentStatus(orderId: string): Promise<ShippingSyncResult> {
  const order = await loadOrder(orderId);
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const providerId = resolveOrderShippingProviderId(order);
  if (providerId !== "sendit") {
    return {
      applied: false,
      fromStatus: order.status,
      toStatus: null,
      shipping: null,
      reason: providerId ? "not_sendit_order" : "no_shipping_provider",
    };
  }

  const trackingId = getStoredShippingTrackingId(order);
  if (!trackingId) {
    return {
      applied: false,
      fromStatus: order.status,
      toStatus: null,
      shipping: null,
      reason: "no_tracking_id",
    };
  }

  const provider = getShippingProviderById("sendit");
  if (!provider.isConfigured()) {
    throw new ShippingNotConfiguredError("Sendit is not configured.");
  }

  const shipping = await provider.getShipmentStatus(trackingId);
  return applyAuthoritativeShippingStatus({ order, shipping });
}

/**
 * Webhook path: resolve order from Sendit identifiers, then API-authoritative sync.
 * Claimed webhook status is ignored for mutations.
 */
export async function syncSenditOrderFromWebhookHints(input: {
  shipmentCode: string | null;
  merchantReference: string | null;
}): Promise<ShippingSyncResult & { orderId: string | null }> {
  let order: OrderWithRelations | null = null;

  if (input.merchantReference) {
    const byRef = await loadOrder(input.merchantReference);
    if (byRef && resolveOrderShippingProviderId(byRef) === "sendit") {
      order = byRef;
    }
  }

  if (!order && input.shipmentCode) {
    order = await prisma.order.findFirst({
      where: {
        shippingProvider: "sendit",
        shippingTrackingId: input.shipmentCode,
      },
      include: { product: true, metaEventLogs: true },
    });
  }

  if (!order) {
    return {
      applied: false,
      fromStatus: "PENDING",
      toStatus: null,
      shipping: null,
      orderId: null,
      reason: "order_not_found",
    };
  }

  const trackingId = getStoredShippingTrackingId(order) || input.shipmentCode;
  if (!trackingId) {
    return {
      applied: false,
      fromStatus: order.status,
      toStatus: null,
      shipping: null,
      orderId: order.id,
      reason: "no_tracking_id",
    };
  }

  const provider = getShippingProviderById("sendit");
  if (!provider.isConfigured()) {
    throw new ShippingNotConfiguredError("Sendit is not configured.");
  }

  const shipping = await provider.getShipmentStatus(trackingId);
  const result = await applyAuthoritativeShippingStatus({ order, shipping });
  return { ...result, orderId: order.id };
}
