export type MetaEventPrefix = "vc" | "atc" | "ic" | "purchase";

export function createMetaEventId(prefix: MetaEventPrefix): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Deterministic Purchase event_id for browser/server deduplication.
 * Retries MUST reuse this value for the same order.
 */
export function purchaseEventId(orderId: string): string {
  return orderId.trim();
}

/** Deterministic CAPI event_id for first CONFIRMED transition. */
export function qualifiedOrderEventId(orderId: string): string {
  return `qualified-order:${orderId.trim()}`;
}

/** Deterministic CAPI event_id for first DELIVERED transition. */
export function deliveredOrderEventId(orderId: string): string {
  return `delivered-order:${orderId.trim()}`;
}

/** Internal-only lifecycle ids (not sent to Meta in Step 3). */
export function cancelledOrderEventId(orderId: string): string {
  return `cancelled-order:${orderId.trim()}`;
}

export function returnedOrderEventId(orderId: string): string {
  return `returned-order:${orderId.trim()}`;
}
