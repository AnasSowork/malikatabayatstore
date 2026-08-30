import type { MetaEventLog, Order } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { purchaseEventId } from "@/lib/meta-event-id";
import {
  sendOrRetryMetaOrderEvent,
  type MetaOrderSendResult,
  type OrderForLifecycleMeta,
} from "@/lib/order-lifecycle-analytics";
import { metaProductEventSourceUrl } from "@/lib/meta-store-url";

export type PurchaseBackfillReason =
  | "missing_log"
  | "failed"
  | "skipped_consent"
  | "pending_stuck";

export type PurchaseBackfillCandidate = {
  orderId: string;
  createdAt: string;
  customerName: string;
  totalPrice: string;
  reason: PurchaseBackfillReason;
  purchaseLogStatus: string | null;
  errorCode: string | null;
  metaFbp: boolean;
  metaFbc: boolean;
  hasUtm: boolean;
};

export type MetaPurchaseDiagnostics = {
  totals: {
    orders: number;
    purchaseSent: number;
    purchaseFailed: number;
    purchaseSkipped: number;
    purchaseMissing: number;
    purchasePending: number;
    backfillCandidates: number;
  };
  attribution: {
    withFbp: number;
    withFbc: number;
    withUtm: number;
    withNeither: number;
  };
  candidates: PurchaseBackfillCandidate[];
};

type OrderWithPurchaseLog = Order & {
  metaEventLogs: MetaEventLog[];
  product?: { name?: string | null } | null;
};

export function findPurchaseLog(logs: MetaEventLog[]): MetaEventLog | undefined {
  return logs.find((row) => row.eventName === "Purchase");
}

export function getPurchaseBackfillReason(
  log: MetaEventLog | undefined,
): PurchaseBackfillReason | null {
  if (!log) return "missing_log";
  if (log.status === "FAILED") return "failed";
  if (log.status === "SKIPPED" && log.errorCode === "marketing_consent_denied") {
    return "skipped_consent";
  }
  if (log.status === "PENDING") return "pending_stuck";
  return null;
}

export function toLifecycleOrder(order: OrderWithPurchaseLog): OrderForLifecycleMeta {
  return {
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    city: order.city,
    productId: order.productId,
    quantity: order.quantity,
    totalPrice: order.totalPrice,
    marketingConsent: order.marketingConsent,
    metaFbp: order.metaFbp,
    metaFbc: order.metaFbc,
    product: order.product ?? null,
  };
}

export async function backfillOrderPurchase(
  order: OrderWithPurchaseLog,
): Promise<{ result: MetaOrderSendResult; reason: PurchaseBackfillReason | null }> {
  const purchaseLog = findPurchaseLog(order.metaEventLogs);
  const reason = getPurchaseBackfillReason(purchaseLog);
  if (!reason) {
    return { result: "already_done", reason: null };
  }

  const result = await sendOrRetryMetaOrderEvent({
    order: toLifecycleOrder(order),
    eventName: "Purchase",
    eventId: purchaseEventId(order.id),
    eventTime: Math.floor(order.createdAt.getTime() / 1000),
    eventSourceUrl: metaProductEventSourceUrl(order.productId),
    productName: order.product?.name ?? null,
    fbp: order.metaFbp,
    fbc: order.metaFbc,
    failedOnly: reason === "failed",
    retrySkipped: reason === "skipped_consent",
  });

  return { result, reason };
}

function summarizeCandidate(order: OrderWithPurchaseLog): PurchaseBackfillCandidate | null {
  const purchaseLog = findPurchaseLog(order.metaEventLogs);
  const reason = getPurchaseBackfillReason(purchaseLog);
  if (!reason) return null;

  return {
    orderId: order.id,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    totalPrice: order.totalPrice.toString(),
    reason,
    purchaseLogStatus: purchaseLog?.status ?? null,
    errorCode: purchaseLog?.errorCode ?? null,
    metaFbp: Boolean(order.metaFbp),
    metaFbc: Boolean(order.metaFbc),
    hasUtm: Boolean(order.utmSource || order.utmCampaign),
  };
}

export async function loadMetaPurchaseDiagnostics(limit = 100): Promise<MetaPurchaseDiagnostics> {
  const orders = await prisma.order.findMany({
    include: {
      metaEventLogs: { where: { eventName: "Purchase" } },
      product: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let purchaseSent = 0;
  let purchaseFailed = 0;
  let purchaseSkipped = 0;
  let purchaseMissing = 0;
  let purchasePending = 0;
  let withFbp = 0;
  let withFbc = 0;
  let withUtm = 0;
  let withNeither = 0;

  const candidates: PurchaseBackfillCandidate[] = [];

  for (const order of orders) {
    const purchaseLog = findPurchaseLog(order.metaEventLogs);
    if (order.metaFbp) withFbp += 1;
    if (order.metaFbc) withFbc += 1;
    if (order.utmSource || order.utmCampaign) withUtm += 1;
    if (!order.metaFbp && !order.metaFbc) withNeither += 1;

    if (!purchaseLog) {
      purchaseMissing += 1;
    } else {
      switch (purchaseLog.status) {
        case "SENT":
          purchaseSent += 1;
          break;
        case "FAILED":
          purchaseFailed += 1;
          break;
        case "SKIPPED":
          purchaseSkipped += 1;
          break;
        case "PENDING":
          purchasePending += 1;
          break;
      }
    }

    const candidate = summarizeCandidate(order);
    if (candidate) candidates.push(candidate);
  }

  return {
    totals: {
      orders: orders.length,
      purchaseSent,
      purchaseFailed,
      purchaseSkipped,
      purchaseMissing,
      purchasePending,
      backfillCandidates: candidates.length,
    },
    attribution: {
      withFbp,
      withFbc,
      withUtm,
      withNeither,
    },
    candidates: candidates.slice(0, limit),
  };
}

export async function backfillPurchaseBatch(input: {
  orderIds?: string[];
  limit?: number;
  delayMs?: number;
}): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  alreadyDone: number;
  results: Array<{
    orderId: string;
    reason: PurchaseBackfillReason | null;
    result: MetaOrderSendResult;
  }>;
}> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const delayMs = Math.max(input.delayMs ?? 150, 0);

  let orders: OrderWithPurchaseLog[];

  if (input.orderIds?.length) {
    orders = await prisma.order.findMany({
      where: { id: { in: input.orderIds.slice(0, limit) } },
      include: {
        metaEventLogs: { where: { eventName: "Purchase" } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  } else {
    const diagnostics = await loadMetaPurchaseDiagnostics(500);
    const ids = diagnostics.candidates.slice(0, limit).map((row) => row.orderId);
    orders = await prisma.order.findMany({
      where: { id: { in: ids } },
      include: {
        metaEventLogs: { where: { eventName: "Purchase" } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  const results: Array<{
    orderId: string;
    reason: PurchaseBackfillReason | null;
    result: MetaOrderSendResult;
  }> = [];

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let alreadyDone = 0;

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i]!;
    const { result, reason } = await backfillOrderPurchase(order);
    results.push({ orderId: order.id, reason, result });

    if (result === "sent") sent += 1;
    else if (result === "failed") failed += 1;
    else if (result === "skipped") skipped += 1;
    else alreadyDone += 1;

    if (delayMs > 0 && i < orders.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    processed: results.length,
    sent,
    failed,
    skipped,
    alreadyDone,
    results,
  };
}
