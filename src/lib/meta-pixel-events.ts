"use client";

const CURRENCY = "MAD";
export const META_PENDING_PURCHASE_KEY = "meta_pending_purchase";

export type PendingPurchase = {
  productId: string;
  value: number;
  quantity: number;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function whenFbqReady(run: () => void, maxWaitMs = 8000) {
  if (typeof window === "undefined") return;

  const start = Date.now();
  const attempt = () => {
    if (window.fbq) {
      run();
      return;
    }
    if (Date.now() - start >= maxWaitMs) return;
    window.setTimeout(attempt, 100);
  };

  attempt();
}

function track(event: string, params?: Record<string, unknown>) {
  whenFbqReady(() => {
    if (params) {
      window.fbq?.("track", event, params);
      return;
    }
    window.fbq?.("track", event);
  });
}

export function savePendingPurchase(input: PendingPurchase) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(META_PENDING_PURCHASE_KEY, JSON.stringify(input));
}

export function readPendingPurchase(): PendingPurchase | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(META_PENDING_PURCHASE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingPurchase;
  } catch {
    sessionStorage.removeItem(META_PENDING_PURCHASE_KEY);
    return null;
  }
}

export function clearPendingPurchase() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(META_PENDING_PURCHASE_KEY);
}

export function trackViewContent(input: {
  productId: string;
  productName: string;
  value: number;
}) {
  track("ViewContent", {
    content_ids: [input.productId],
    content_name: input.productName,
    content_type: "product",
    value: input.value,
    currency: CURRENCY,
  });
}

export function trackInitiateCheckout(input: {
  productId: string;
  value: number;
  quantity: number;
}) {
  track("InitiateCheckout", {
    content_ids: [input.productId],
    content_type: "product",
    value: input.value,
    currency: CURRENCY,
    num_items: input.quantity,
  });
}

export function trackPurchase(input: PendingPurchase) {
  track("Purchase", {
    content_ids: [input.productId],
    content_type: "product",
    value: input.value,
    currency: CURRENCY,
    num_items: input.quantity,
  });
}

export function flushPendingPurchase() {
  const pending = readPendingPurchase();
  if (!pending) return;
  clearPendingPurchase();
  trackPurchase(pending);
}
