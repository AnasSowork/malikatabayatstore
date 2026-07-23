"use client";

import { buildMetaCommerceData } from "@/lib/meta-commerce";
import { createMetaEventId, purchaseEventId } from "@/lib/meta-event-id";

const CURRENCY = "MAD";
export const META_PENDING_PURCHASE_KEY = "meta_pending_purchase";
const META_PURCHASE_FIRED_KEY = "meta_purchase_fired";

export type PendingPurchase = {
  productId: string;
  value: number;
  quantity: number;
  orderId: string;
  productName?: string;
};

export type MetaTrackInput = {
  productId: string;
  productName?: string;
  value: number;
  quantity: number;
  unitPrice?: number;
  eventId: string;
  user?: {
    phone?: string;
    fullName?: string;
    city?: string;
    externalId?: string;
  };
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

function getMetaCookie(name: "_fbp" | "_fbc"): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function commerceParams(input: Pick<MetaTrackInput, "productId" | "productName" | "value" | "quantity" | "unitPrice">) {
  const data = buildMetaCommerceData(input);
  if (input.productName) {
    return { ...data, content_name: input.productName };
  }
  return data;
}

function trackPixel(eventName: string, params: Record<string, unknown>, eventId: string) {
  whenFbqReady(() => {
    window.fbq?.("track", eventName, params, { eventID: eventId });
  });
}

function sendCapiEvent(
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase",
  input: MetaTrackInput,
) {
  if (typeof window === "undefined") return;

  void fetch("/api/meta/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventName,
      eventId: input.eventId,
      eventSourceUrl: window.location.href,
      fbp: getMetaCookie("_fbp"),
      fbc: getMetaCookie("_fbc"),
      productId: input.productId,
      productName: input.productName,
      value: input.value,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      user: input.user,
    }),
  }).catch(() => {
    /* CAPI is best-effort; Pixel remains primary on the client */
  });
}

function trackDual(
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase",
  input: MetaTrackInput,
) {
  const params = commerceParams(input);
  trackPixel(eventName, params, input.eventId);
  sendCapiEvent(eventName, input);
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
  eventId?: string;
}) {
  const eventId = input.eventId ?? createMetaEventId("vc");
  trackDual("ViewContent", {
    productId: input.productId,
    productName: input.productName,
    value: input.value,
    quantity: 1,
    unitPrice: input.value,
    eventId,
  });
  return eventId;
}

export function trackAddToCart(input: {
  productId: string;
  productName?: string;
  value: number;
  quantity: number;
  unitPrice?: number;
  eventId?: string;
}) {
  const eventId = input.eventId ?? createMetaEventId("atc");
  trackDual("AddToCart", { ...input, eventId });
  return eventId;
}

export function trackInitiateCheckout(input: {
  productId: string;
  productName?: string;
  value: number;
  quantity: number;
  unitPrice?: number;
  eventId?: string;
  user?: MetaTrackInput["user"];
}) {
  const eventId = input.eventId ?? createMetaEventId("ic");
  trackDual("InitiateCheckout", { ...input, eventId });
  return eventId;
}

function sendPurchasePixelOnly(input: PendingPurchase) {
  const eventId = purchaseEventId(input.orderId);
  trackPixel(
    "Purchase",
    commerceParams({
      productId: input.productId,
      productName: input.productName,
      value: input.value,
      quantity: input.quantity,
    }),
    eventId,
  );
}

export function getMetaBrowserIds() {
  return {
    fbp: getMetaCookie("_fbp"),
    fbc: getMetaCookie("_fbc"),
  };
}

function purchaseFiredKey(orderId: string) {
  return `${META_PURCHASE_FIRED_KEY}:${orderId}`;
}

/** Fires Purchase once on the thank-you page (browser Pixel only; CAPI Purchase is sent server-side). */
export function flushPendingPurchase() {
  if (typeof window === "undefined") return;

  const pending = readPendingPurchase();
  if (!pending) return;

  const firedKey = purchaseFiredKey(pending.orderId);
  if (sessionStorage.getItem(firedKey)) {
    clearPendingPurchase();
    return;
  }

  sessionStorage.setItem(firedKey, "1");

  whenFbqReady(() => {
    sendPurchasePixelOnly(pending);
    clearPendingPurchase();
  });
}

export { CURRENCY, createMetaEventId, purchaseEventId };
