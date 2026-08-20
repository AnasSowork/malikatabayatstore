import { prisma } from "@/lib/prisma";
import type { MetaEventLogStatus } from "@prisma/client";

export type MetaBusinessEventName =
  | "Purchase"
  | "QualifiedOrder"
  | "DeliveredOrder"
  | "CancelledOrder"
  | "ReturnedOrder";

/**
 * Idempotent Meta delivery log. Unique on (orderId, eventName).
 * Does not store customer PII.
 *
 * SKIPPED / SENT are terminal for automatic sends — never re-send.
 */
export async function beginMetaEventAttempt(input: {
  orderId: string;
  eventName: MetaBusinessEventName;
  eventId: string;
}): Promise<{ shouldSend: boolean; logId: string | null }> {
  try {
    const existing = await prisma.metaEventLog.findUnique({
      where: {
        orderId_eventName: {
          orderId: input.orderId,
          eventName: input.eventName,
        },
      },
    });

    if (existing?.status === "SENT" || existing?.status === "SKIPPED") {
      return { shouldSend: false, logId: existing.id };
    }

    if (existing) {
      const updated = await prisma.metaEventLog.update({
        where: { id: existing.id },
        data: {
          eventId: input.eventId,
          status: "PENDING",
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          errorCode: null,
        },
      });
      return { shouldSend: true, logId: updated.id };
    }

    const created = await prisma.metaEventLog.create({
      data: {
        orderId: input.orderId,
        eventName: input.eventName,
        eventId: input.eventId,
        status: "PENDING",
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });
    return { shouldSend: true, logId: created.id };
  } catch (error) {
    console.error(
      "[meta-event-log] begin failed",
      input.eventName,
      error instanceof Error ? error.message : error,
    );
    // Fail open for send attempt — order path must not break.
    return { shouldSend: true, logId: null };
  }
}

export async function finishMetaEventAttempt(input: {
  logId: string | null;
  orderId: string;
  eventName: MetaBusinessEventName;
  eventId: string;
  status: Extract<MetaEventLogStatus, "SENT" | "FAILED" | "SKIPPED">;
  errorCode?: string | null;
}): Promise<void> {
  try {
    if (input.logId) {
      await prisma.metaEventLog.update({
        where: { id: input.logId },
        data: {
          status: input.status,
          eventId: input.eventId,
          sentAt: input.status === "SENT" ? new Date() : undefined,
          errorCode: input.errorCode ?? null,
          lastAttemptAt: new Date(),
        },
      });
      return;
    }

    await prisma.metaEventLog.upsert({
      where: {
        orderId_eventName: {
          orderId: input.orderId,
          eventName: input.eventName,
        },
      },
      create: {
        orderId: input.orderId,
        eventName: input.eventName,
        eventId: input.eventId,
        status: input.status,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        sentAt: input.status === "SENT" ? new Date() : null,
        errorCode: input.errorCode ?? null,
      },
      update: {
        status: input.status,
        eventId: input.eventId,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        sentAt: input.status === "SENT" ? new Date() : undefined,
        errorCode: input.errorCode ?? null,
      },
    });
  } catch (error) {
    console.error(
      "[meta-event-log] finish failed",
      input.eventName,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Record a business lifecycle outcome without calling Meta CAPI.
 * Uses SKIPPED + errorCode so MetaEventLog stays Meta-delivery-oriented
 * while still answering "did this transition happen once?".
 */
export async function recordInternalLifecycleEvent(input: {
  orderId: string;
  eventName: Extract<MetaBusinessEventName, "CancelledOrder" | "ReturnedOrder">;
  eventId: string;
  errorCode?: string;
}): Promise<void> {
  try {
    const existing = await prisma.metaEventLog.findUnique({
      where: {
        orderId_eventName: {
          orderId: input.orderId,
          eventName: input.eventName,
        },
      },
    });
    if (existing) return;

    await prisma.metaEventLog.create({
      data: {
        orderId: input.orderId,
        eventName: input.eventName,
        eventId: input.eventId,
        status: "SKIPPED",
        attemptCount: 0,
        lastAttemptAt: new Date(),
        errorCode: input.errorCode ?? "internal_only_not_sent_to_meta",
      },
    });
  } catch (error) {
    console.error(
      "[meta-event-log] internal lifecycle record failed",
      input.eventName,
      error instanceof Error ? error.message : error,
    );
  }
}

export type SerializedMetaEventLog = {
  eventName: string;
  eventId: string;
  status: MetaEventLogStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  errorCode: string | null;
};

export function serializeMetaEventLog(log: {
  eventName: string;
  eventId: string;
  status: MetaEventLogStatus;
  attemptCount: number;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  errorCode: string | null;
}): SerializedMetaEventLog {
  return {
    eventName: log.eventName,
    eventId: log.eventId,
    status: log.status,
    attemptCount: log.attemptCount,
    lastAttemptAt: log.lastAttemptAt?.toISOString() ?? null,
    sentAt: log.sentAt?.toISOString() ?? null,
    errorCode: log.errorCode,
  };
}
