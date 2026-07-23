export type MetaEventPrefix = "vc" | "atc" | "ic" | "purchase";

export function createMetaEventId(prefix: MetaEventPrefix): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function purchaseEventId(orderId: string): string {
  return orderId.trim();
}
