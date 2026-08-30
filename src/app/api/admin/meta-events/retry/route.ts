import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  backfillOrderPurchase,
  findPurchaseLog,
  getPurchaseBackfillReason,
  metaBackfillEventTime,
} from "@/lib/meta-backfill";
import {
  sendOrRetryMetaOrderEvent,
  type MetaOrderSendResult,
} from "@/lib/order-lifecycle-analytics";
import { metaProductEventSourceUrl } from "@/lib/meta-store-url";
import type { MetaBusinessEventName } from "@/lib/meta-event-log";

export const runtime = "nodejs";

const RETRYABLE_EVENTS = ["Purchase", "QualifiedOrder", "DeliveredOrder"] as const;
type RetryableEvent = (typeof RETRYABLE_EVENTS)[number];

function isRetryableEvent(value: unknown): value is RetryableEvent {
  return typeof value === "string" && (RETRYABLE_EVENTS as readonly string[]).includes(value);
}

/**
 * Admin-only: retry FAILED / missing Purchase or FAILED lifecycle Meta CAPI events.
 */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        metaEventLogs: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const requestedName = body.eventName;

    if (isRetryableEvent(requestedName) && requestedName === "Purchase") {
      const { result, reason } = await backfillOrderPurchase(order);
      const refreshed = await prisma.metaEventLog.findMany({
        where: { orderId },
        orderBy: { eventName: "asc" },
      });

      return NextResponse.json({
        ok: true,
        results: [{ eventName: "Purchase" as const, result, reason }],
        metaEventLogs: refreshed.map((log) => ({
          eventName: log.eventName,
          eventId: log.eventId,
          status: log.status,
          attemptCount: log.attemptCount,
          lastAttemptAt: log.lastAttemptAt?.toISOString() ?? null,
          sentAt: log.sentAt?.toISOString() ?? null,
          errorCode: log.errorCode,
        })),
      });
    }

    const eventNames: RetryableEvent[] = isRetryableEvent(requestedName)
      ? [requestedName]
      : RETRYABLE_EVENTS.filter((name) => {
          if (name === "Purchase") {
            return getPurchaseBackfillReason(findPurchaseLog(order.metaEventLogs)) !== null;
          }
          return order.metaEventLogs.some(
            (log) => log.eventName === name && log.status === "FAILED",
          );
        });

    if (eventNames.length === 0) {
      return NextResponse.json({
        ok: true,
        results: [] as Array<{ eventName: string; result: MetaOrderSendResult }>,
        message: "No Meta events to retry",
      });
    }

    const results: Array<{
      eventName: MetaBusinessEventName;
      result: MetaOrderSendResult;
      reason?: string | null;
    }> = [];

    for (const eventName of eventNames) {
      if (eventName === "Purchase") {
        const { result, reason } = await backfillOrderPurchase(order);
        results.push({ eventName, result, reason });
        continue;
      }

      const log = order.metaEventLogs.find((row) => row.eventName === eventName);
      const result = await sendOrRetryMetaOrderEvent({
        order,
        eventName,
        eventTime: metaBackfillEventTime(order.createdAt),
        eventSourceUrl: metaProductEventSourceUrl(order.productId),
        productName: order.product?.name ?? null,
        fbp: order.metaFbp,
        fbc: order.metaFbc,
        failedOnly: true,
      });
      results.push({ eventName, result, reason: log?.errorCode ?? null });
    }

    const refreshed = await prisma.metaEventLog.findMany({
      where: { orderId },
      orderBy: { eventName: "asc" },
    });

    return NextResponse.json({
      ok: true,
      results,
      metaEventLogs: refreshed.map((log) => ({
        eventName: log.eventName,
        eventId: log.eventId,
        status: log.status,
        attemptCount: log.attemptCount,
        lastAttemptAt: log.lastAttemptAt?.toISOString() ?? null,
        sentAt: log.sentAt?.toISOString() ?? null,
        errorCode: log.errorCode,
      })),
    });
  } catch (error) {
    console.error("[admin/meta-events/retry]", error);
    return NextResponse.json({ error: "Failed to retry Meta events" }, { status: 500 });
  }
}
