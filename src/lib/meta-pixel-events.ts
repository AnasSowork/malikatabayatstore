"use client";

const CURRENCY = "MAD";
export const META_PENDING_PURCHASE_KEY = "meta_pending_purchase";
const META_PURCHASE_FIRED_KEY = "meta_purchase_fired";

export type PendingPurchase = {
  productId: string;
  value: number;
  quantity: number;
  orderId: string;
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

function purchaseParams(input: PendingPurchase) {
  return {
    content_ids: [input.productId],
    content_type: "product",
    value: input.value,
    currency: CURRENCY,
    num_items: input.quantity,
  };
}

function sendPurchase(input: PendingPurchase) {
  const params = purchaseParams(input);
  if (input.orderId) {
    window.fbq?.("track", "Purchase", params, { eventID: input.orderId });
    return;
  }
  window.fbq?.("track", "Purchase", params);
}

export function trackPurchase(input: PendingPurchase) {
  whenFbqReady(() => sendPurchase(input));
}

function purchaseFiredKey(orderId: string) {
  return `${META_PURCHASE_FIRED_KEY}:${orderId}`;
}

/** Fires Purchase once on the thank-you page after a successful order. */
export function flushPendingPurchase() {
  if (typeof window === "undefined") return;

  const pending = readPendingPurchase();
  if (!pending) return;

  const firedKey = purchaseFiredKey(pending.orderId || META_PENDING_PURCHASE_KEY);
  if (sessionStorage.getItem(firedKey)) {
    clearPendingPurchase();
    return;
  }

  sessionStorage.setItem(firedKey, "1");

  whenFbqReady(() => {
    sendPurchase(pending);
    clearPendingPurchase();
  });
}
