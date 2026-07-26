"use client";

import {
  captureMetaBrowserIds,
  getMetaBrowserIds,
} from "@/lib/meta-browser-cookies";
import { buildMetaCommerceData } from "@/lib/meta-commerce";
import { createMetaEventId, purchaseEventId } from "@/lib/meta-event-id";
import { buildMetaPixelUserData, type MetaPixelUserData } from "@/lib/meta-pixel-user";

const CURRENCY = "MAD";
export const META_PENDING_PURCHASE_KEY = "meta_pending_purchase";
const META_PURCHASE_FIRED_KEY = "meta_purchase_fired";
const META_CAPI_QUEUE_KEY = "meta_capi_queue";
const MAX_CAPI_QUEUE = 24;

export type PendingPurchase = {
  productId: string;
  value: number;
  quantity: number;
  orderId: string;
  productName?: string;
  phone?: string;
  fullName?: string;
  city?: string;
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

function whenFbqReady(run: () => void, maxWaitMs = 15000) {
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

/** Updates Pixel Advanced Matching when the customer fills checkout fields. */
export function setMetaPixelUserData(user: MetaPixelUserData) {
  if (typeof window === "undefined") return;
  const data = buildMetaPixelUserData(user);
  if (Object.keys(data).length === 0) return;
  whenFbqReady(() => {
    window.fbq?.("set", "userData", data);
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type CapiPayload = {
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";
  eventId: string;
  eventSourceUrl: string;
  fbp: string | null;
  fbc: string | null;
  productId: string;
  productName?: string;
  value: number;
  quantity: number;
  unitPrice?: number;
  user?: MetaTrackInput["user"];
};

type QueuedCapiPayload = CapiPayload & { queuedAt: number };

function buildCapiPayload(
  eventName: CapiPayload["eventName"],
  input: MetaTrackInput,
): CapiPayload {
  const { fbp, fbc } = getMetaBrowserIds();
  return {
    eventName,
    eventId: input.eventId,
    eventSourceUrl: window.location.href,
    fbp,
    fbc,
    productId: input.productId,
    productName: input.productName,
    value: input.value,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    user: input.user,
  };
}

function readCapiQueue(): QueuedCapiPayload[] {
  if (typeof window === "undefined") return [];
  const raw = sessionStorage.getItem(META_CAPI_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueuedCapiPayload[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_CAPI_QUEUE) : [];
  } catch {
    sessionStorage.removeItem(META_CAPI_QUEUE_KEY);
    return [];
  }
}

function writeCapiQueue(items: QueuedCapiPayload[]) {
  if (typeof window === "undefined") return;
  if (items.length === 0) {
    sessionStorage.removeItem(META_CAPI_QUEUE_KEY);
    return;
  }
  sessionStorage.setItem(META_CAPI_QUEUE_KEY, JSON.stringify(items.slice(-MAX_CAPI_QUEUE)));
}

function enqueueCapiPayload(payload: CapiPayload) {
  const queue = readCapiQueue();
  if (queue.some((item) => item.eventId === payload.eventId)) return;
  queue.push({ ...payload, queuedAt: Date.now() });
  writeCapiQueue(queue);
}

async function postCapiPayload(payload: CapiPayload): Promise<boolean> {
  const res = await fetch("/api/meta/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventName: payload.eventName,
      eventId: payload.eventId,
      eventSourceUrl: payload.eventSourceUrl,
      fbp: payload.fbp,
      fbc: payload.fbc,
      productId: payload.productId,
      productName: payload.productName,
      value: payload.value,
      quantity: payload.quantity,
      unitPrice: payload.unitPrice,
      user: payload.user,
    }),
  });

  if (!res.ok) return false;
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
  return Boolean(json.ok);
}

async function sendCapiPayload(payload: CapiPayload, retries = 2): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const sent = await postCapiPayload(payload);
      if (sent) return true;
    } catch {
      /* retry */
    }
    if (attempt < retries) {
      await sleep(400 * (attempt + 1));
    }
  }
  return false;
}

/** Retry CAPI events that failed when the user navigated away or the pixel was still loading. */
export function flushCapiQueue() {
  if (typeof window === "undefined") return;

  whenFbqReady(() => {
    captureMetaBrowserIds();
    const queue = readCapiQueue();
    if (queue.length === 0) return;

    void (async () => {
      const { fbp, fbc } = getMetaBrowserIds();
      const remaining: QueuedCapiPayload[] = [];
      for (const item of queue) {
        const payload: CapiPayload = {
          eventName: item.eventName,
          eventId: item.eventId,
          eventSourceUrl: item.eventSourceUrl,
          fbp: fbp ?? item.fbp,
          fbc: fbc ?? item.fbc,
          productId: item.productId,
          productName: item.productName,
          value: item.value,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          user: item.user,
        };
        const sent = await sendCapiPayload(payload, 1);
        if (!sent) remaining.push(item);
      }
      writeCapiQueue(remaining);
    })();
  });
}

function sendCapiEvent(
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase",
  input: MetaTrackInput,
) {
  if (typeof window === "undefined") return;

  whenFbqReady(() => {
    captureMetaBrowserIds();
    const payload = buildCapiPayload(eventName, input);
    void (async () => {
      const sent = await sendCapiPayload(payload);
      if (!sent) enqueueCapiPayload(payload);
    })();
  });
}

function trackDual(
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase",
  input: MetaTrackInput,
) {
  const params = commerceParams(input);
  whenFbqReady(() => {
    captureMetaBrowserIds();
    window.fbq?.("track", eventName, params, { eventID: input.eventId });
    const payload = buildCapiPayload(eventName, input);
    void (async () => {
      const sent = await sendCapiPayload(payload);
      if (!sent) enqueueCapiPayload(payload);
    })();
  });
  flushCapiQueue();
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
  if (input.user) {
    setMetaPixelUserData(input.user);
  }
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

export { getMetaBrowserIds, captureMetaBrowserIds } from "@/lib/meta-browser-cookies";

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

  sendCapiEvent("Purchase", {
    productId: pending.productId,
    productName: pending.productName,
    value: pending.value,
    quantity: pending.quantity,
    eventId: purchaseEventId(pending.orderId),
    user: {
      phone: pending.phone,
      fullName: pending.fullName,
      city: pending.city,
      externalId: pending.orderId,
    },
  });

  whenFbqReady(() => {
    sendPurchasePixelOnly(pending);
    clearPendingPurchase();
  });
}

export { CURRENCY, createMetaEventId, purchaseEventId };
