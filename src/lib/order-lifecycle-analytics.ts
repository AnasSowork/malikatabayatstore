import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  hashOrderPiiForCapi,
  type MetaCapiResolvedUserData,
} from "@/lib/meta-param-builder-server";
import { sendMetaCapiEvent } from "@/lib/meta-capi-server";
import {
  cancelledOrderEventId,
  deliveredOrderEventId,
  purchaseEventId,
  qualifiedOrderEventId,
  returnedOrderEventId,
} from "@/lib/meta-event-id";
import {
  beginMetaEventAttempt,
  finishMetaEventAttempt,
  recordInternalLifecycleEvent,
  type MetaBusinessEventName,
} from "@/lib/meta-event-log";

export type OrderForLifecycleMeta = {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  productId: string;
  quantity: number;
  totalPrice: { toString(): string } | number | string;
  marketingConsent: boolean | null;
  metaFbp: string | null;
  metaFbc: string | null;
  product?: { name?: string | null } | null;
};

export type MetaOrderSendResult = "sent" | "failed" | "skipped" | "already_done";

type MetaSendableEventName = Extract<
  MetaBusinessEventName,
  "Purchase" | "QualifiedOrder" | "DeliveredOrder"
>;

function orderValue(order: OrderForLifecycleMeta): number {
  return Number(order.totalPrice);
}

function eventIdFor(eventName: MetaSendableEventName, orderId: string): string {
  switch (eventName) {
    case "Purchase":
      return purchaseEventId(orderId);
    case "QualifiedOrder":
      return qualifiedOrderEventId(orderId);
    case "DeliveredOrder":
      return deliveredOrderEventId(orderId);
  }
}

/**
 * Idempotent Meta CAPI send/retry for order-bound events.
 * Never throws to callers — safe after DB status commits.
 */
export async function sendOrRetryMetaOrderEvent(input: {
  order: OrderForLifecycleMeta;
  eventName: MetaSendableEventName;
  /** Prefer deterministic helper; if omitted, derived from eventName + order.id */
  eventId?: string;
  eventTime?: number;
  eventSourceUrl?: string | null;
  productName?: string | null;
  /** Only for Purchase at checkout — omit for later lifecycle events */
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  referrerUrl?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  paramBuilderHashed?: MetaCapiResolvedUserData["hashed"] | null;
  /** When true, only FAILED rows are re-attempted (admin retry). */
  failedOnly?: boolean;
  /** Admin retry: re-send Purchase previously SKIPPED for marketing consent. */
  retrySkipped?: boolean;
}): Promise<MetaOrderSendResult> {
  const eventId = input.eventId?.trim() || eventIdFor(input.eventName, input.order.id);

  try {
    let existing = await prisma.metaEventLog.findUnique({
      where: {
        orderId_eventName: {
          orderId: input.order.id,
          eventName: input.eventName,
        },
      },
    });

    if (existing?.status === "SENT") {
      return "already_done";
    }

    if (existing?.status === "SKIPPED") {
      const canRetrySkippedPurchase =
        input.retrySkipped &&
        input.eventName === "Purchase" &&
        existing.errorCode === "marketing_consent_denied";
      if (!canRetrySkippedPurchase) {
        return "already_done";
      }
      await prisma.metaEventLog.delete({ where: { id: existing.id } });
      existing = null;
    }

    if (input.failedOnly) {
      if (!existing || existing.status !== "FAILED") return "already_done";
    }

    // Purchase is first-party server conversion data — always send via CAPI.
    // Browser Pixel Purchase remains consent-gated in meta-pixel-events.ts.
    const skipForConsent =
      input.eventName !== "Purchase" && input.order.marketingConsent === false;
    if (skipForConsent) {
      await finishMetaEventAttempt({
        logId: existing?.id ?? null,
        orderId: input.order.id,
        eventName: input.eventName,
        eventId,
        status: "SKIPPED",
        errorCode: "marketing_consent_denied",
      });
      return "skipped";
    }

    const { shouldSend, logId } = await beginMetaEventAttempt({
      orderId: input.order.id,
      eventName: input.eventName,
      eventId,
    });
    if (!shouldSend) return "already_done";

    const value = orderValue(input.order);
    const quantity = Math.max(1, input.order.quantity);
    const hashedPii =
      input.paramBuilderHashed ?? hashOrderPiiForCapi(input.order);
    const sent = await sendMetaCapiEvent({
      eventName: input.eventName,
      eventId,
      eventTime: input.eventTime ?? Math.floor(Date.now() / 1000),
      eventSourceUrl: input.eventSourceUrl,
      referrerUrl: input.referrerUrl,
      productName: input.productName ?? input.order.product?.name ?? null,
      commerce: {
        productId: input.order.productId,
        value,
        quantity,
        unitPrice: value / quantity,
      },
      user: {
        fbp: input.fbp ?? input.order.metaFbp,
        fbc: input.fbc ?? input.order.metaFbc,
        clientIpAddress: input.clientIpAddress,
        clientUserAgent: input.clientUserAgent,
        paramBuilder: hashedPii,
      },
    });

    await finishMetaEventAttempt({
      logId,
      orderId: input.order.id,
      eventName: input.eventName,
      eventId,
      status: sent ? "SENT" : "FAILED",
      errorCode: sent ? null : "capi_send_failed",
    });

    return sent ? "sent" : "failed";
  } catch (error) {
    console.error(
      "[order-lifecycle-analytics]",
      input.eventName,
      error instanceof Error ? error.message : "unknown error",
    );
    try {
      await finishMetaEventAttempt({
        logId: null,
        orderId: input.order.id,
        eventName: input.eventName,
        eventId,
        status: "FAILED",
        errorCode: "capi_exception",
      });
    } catch {
      /* ignore */
    }
    return "failed";
  }
}

/**
 * After a persisted status change: emit transition-based analytics.
 * UI / routes must call this only when fromStatus !== toStatus.
 * Meta failures never throw.
 */
export async function handleOrderStatusTransition(input: {
  order: OrderForLifecycleMeta;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
}): Promise<void> {
  const { order, fromStatus, toStatus } = input;
  if (fromStatus === toStatus) return;

  try {
    if (toStatus === "CONFIRMED") {
      await sendOrRetryMetaOrderEvent({
        order,
        eventName: "QualifiedOrder",
        eventId: qualifiedOrderEventId(order.id),
      });
      return;
    }

    if (toStatus === "DELIVERED") {
      await sendOrRetryMetaOrderEvent({
        order,
        eventName: "DeliveredOrder",
        eventId: deliveredOrderEventId(order.id),
      });
      return;
    }

    if (toStatus === "CANCELLED") {
      await recordInternalLifecycleEvent({
        orderId: order.id,
        eventName: "CancelledOrder",
        eventId: cancelledOrderEventId(order.id),
      });
      return;
    }

    if (toStatus === "RETURNED") {
      await recordInternalLifecycleEvent({
        orderId: order.id,
        eventName: "ReturnedOrder",
        eventId: returnedOrderEventId(order.id),
      });
      return;
    }

    // SHIPPED / PENDING: no Meta or internal MetaEventLog outcome in Step 3
  } catch (error) {
    console.error(
      "[order-lifecycle-analytics] transition",
      fromStatus,
      "→",
      toStatus,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Fire-and-forget wrapper so admin HTTP responses never wait on Meta.
 */
export function scheduleOrderStatusTransition(input: {
  order: OrderForLifecycleMeta;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
}): void {
  if (input.fromStatus === input.toStatus) return;
  void handleOrderStatusTransition(input);
}
