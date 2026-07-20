"use client";

const CURRENCY = "MAD";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params) {
    window.fbq("track", event, params);
    return;
  }
  window.fbq("track", event);
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

export function trackPurchase(input: {
  productId: string;
  value: number;
  quantity: number;
}) {
  track("Purchase", {
    content_ids: [input.productId],
    content_type: "product",
    value: input.value,
    currency: CURRENCY,
    num_items: input.quantity,
  });
}
