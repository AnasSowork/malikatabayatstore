import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { serializeProduct } from "@/lib/product-serialize";
import { toOrderLineItems } from "@/lib/bundle-offers";
import {
  buildDefaultShippingDescription,
  validateOrderForShipping,
} from "@/lib/order-shipping";
import { scheduleOrderStatusTransition } from "@/lib/order-lifecycle-analytics";
import {
  getActiveShippingProvider,
  ShippingAlreadyExistsError,
  ShippingNotConfiguredError,
} from "@/lib/shipping/provider";
import type { CreateShipmentResult, ShippingProviderId } from "@/lib/shipping/types";
import { getLocalizedProductFields } from "@/lib/product-i18n";
import { getStoredShippingTrackingId } from "@/lib/shipping/tracking";
import {
  isPendingShipmentClaim,
  pendingShipmentClaimId,
} from "@/lib/shipping/webhook-abuse";
import { findSenditCodeByReference } from "@/lib/shipping/providers/sendit-cities";

export type ShipmentCreateOutcome = {
  result: CreateShipmentResult;
  order: Awaited<ReturnType<typeof finalizeShipmentOnOrder>>;
};

function trackingPersistData(
  providerId: ShippingProviderId,
  trackingId: string,
): {
  shippingProvider: string;
  shippingTrackingId: string;
  olivraisonTrackingId?: string;
} {
  if (providerId === "sendit") {
    return {
      shippingProvider: "sendit",
      shippingTrackingId: trackingId,
    };
  }
  return {
    shippingProvider: "olivraison",
    shippingTrackingId: trackingId,
    olivraisonTrackingId: trackingId,
  };
}

async function finalizeShipmentOnOrder(input: {
  orderId: string;
  previousStatus: OrderStatus;
  result: CreateShipmentResult;
}) {
  const now = new Date();
  const updated = await prisma.order.update({
    where: { id: input.orderId },
    data: {
      ...trackingPersistData(input.result.providerId, input.result.trackingId),
      shippedAt: now,
      status: "SHIPPED",
      statusUpdatedAt: now,
    },
    include: { product: true, metaEventLogs: true },
  });

  scheduleOrderStatusTransition({
    order: updated,
    fromStatus: input.previousStatus,
    toStatus: "SHIPPED",
  });

  return updated;
}

async function clearPendingClaim(orderId: string): Promise<void> {
  const pending = pendingShipmentClaimId(orderId);
  await prisma.order.updateMany({
    where: { id: orderId, shippingTrackingId: pending },
    data: {
      shippingTrackingId: null,
      shippingProvider: null,
    },
  });
}

/**
 * Provider-independent shipment creation.
 * Uses a DB claim (`pending:{orderId}`) to prevent concurrent double-create.
 * After ambiguous Sendit failures, attempts reference reconciliation before retry.
 */
export async function createShipmentForOrder(orderId: string): Promise<ShipmentCreateOutcome> {
  const provider = getActiveShippingProvider();
  if (!provider.isConfigured()) {
    throw new ShippingNotConfiguredError(
      `Shipping provider "${provider.id}" is not configured.`,
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const existingTracking = getStoredShippingTrackingId(order);
  if (existingTracking && !isPendingShipmentClaim(existingTracking, orderId)) {
    throw new ShippingAlreadyExistsError(existingTracking);
  }
  if (isPendingShipmentClaim(existingTracking, orderId)) {
    throw new ShippingAlreadyExistsError(existingTracking!);
  }

  const product = serializeProduct(order.product);
  const shippingOrder = {
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    city: order.city,
    quantity: order.quantity,
    totalPrice: order.totalPrice.toString(),
    lineItems: toOrderLineItems(order.lineItems),
    streetAddress: order.streetAddress,
    shippingComment: order.shippingComment,
    shippingDescription: order.shippingDescription,
    shippingNoOpen: order.shippingNoOpen,
    product,
  };

  const validationError = validateOrderForShipping(shippingOrder);
  if (validationError) {
    const err = new Error(validationError);
    err.name = "ShippingValidationError";
    throw err;
  }

  const claim = pendingShipmentClaimId(order.id);
  const claimed = await prisma.order.updateMany({
    where: {
      id: order.id,
      shippingTrackingId: null,
      olivraisonTrackingId: null,
    },
    data: {
      shippingProvider: provider.id,
      shippingTrackingId: claim,
    },
  });

  if (claimed.count === 0) {
    const again = await prisma.order.findUnique({ where: { id: order.id } });
    const tid = getStoredShippingTrackingId(again ?? {});
    throw new ShippingAlreadyExistsError(tid || "unknown");
  }

  const description =
    order.shippingDescription?.trim() ||
    buildDefaultShippingDescription(shippingOrder);
  const { name: productName } = getLocalizedProductFields(product, "fr");

  try {
    // Ambiguous prior failure: try reconcile by merchant reference before creating.
    if (provider.id === "sendit") {
      try {
        const existingCode = await findSenditCodeByReference(order.id);
        if (existingCode) {
          const result: CreateShipmentResult = {
            providerId: "sendit",
            trackingId: existingCode,
            normalizedStatus: "CREATED",
            rawStatus: "RECONCILED",
          };
          const updated = await finalizeShipmentOnOrder({
            orderId: order.id,
            previousStatus: order.status,
            result,
          });
          return { result, order: updated };
        }
      } catch {
        // lookup failure is non-fatal; proceed to create
      }
    }

    const result = await provider.createShipment({
      orderId: order.id,
      customerName: order.customerName,
      phone: order.phone,
      city: order.city,
      streetAddress: order.streetAddress!.trim(),
      quantity: order.quantity,
      totalPrice: Number(order.totalPrice),
      description,
      comment: order.shippingComment,
      noOpen: order.shippingNoOpen,
      productName,
    });

    const updated = await finalizeShipmentOnOrder({
      orderId: order.id,
      previousStatus: order.status,
      result,
    });

    return { result, order: updated };
  } catch (error) {
    // If create timed out, parcel may already exist — try reconcile once.
    if (provider.id === "sendit") {
      try {
        const existingCode = await findSenditCodeByReference(order.id);
        if (existingCode) {
          const result: CreateShipmentResult = {
            providerId: "sendit",
            trackingId: existingCode,
            normalizedStatus: "CREATED",
            rawStatus: "RECONCILED_AFTER_ERROR",
          };
          const updated = await finalizeShipmentOnOrder({
            orderId: order.id,
            previousStatus: order.status,
            result,
          });
          return { result, order: updated };
        }
      } catch {
        /* ignore */
      }
    }

    await clearPendingClaim(order.id);
    throw error;
  }
}

export {
  getStoredShippingTrackingId,
  resolveOrderShippingProviderId,
} from "@/lib/shipping/tracking";

export { suggestedOrderStatusFromShipping } from "@/lib/shipping/status-map";
