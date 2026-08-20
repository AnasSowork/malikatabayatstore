import { NextResponse } from "next/server";
import { sanitizeMetaBrowserIdFromBody } from "@/lib/meta-browser-cookies-server";
import { parseMarketingConsentFromBody } from "@/lib/consent";
import {
  clientIpFromRequest,
  META_BROWSER_RELAY_EVENTS,
  sendMetaCapiEvent,
  type MetaCapiEventName,
} from "@/lib/meta-capi-server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_EVENTS = new Set<string>(META_BROWSER_RELAY_EVENTS);
const MAX_VALUE = 1_000_000;
const MAX_QUANTITY = 50;
const MAX_EVENT_ID_LEN = 128;
const MAX_PRODUCT_ID_LEN = 64;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

type Body = {
  eventName?: unknown;
  eventId?: unknown;
  eventSourceUrl?: unknown;
  fbp?: unknown;
  fbc?: unknown;
  productId?: unknown;
  productName?: unknown;
  value?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  marketingConsent?: unknown;
  user?: {
    phone?: unknown;
    firstName?: unknown;
    fullName?: unknown;
    city?: unknown;
    externalId?: unknown;
  };
};

function asString(value: unknown, maxLen = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clientKey(request: Request): string {
  return clientIpFromRequest(request) || "unknown";
}

function rateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX) return false;
  bucket.count += 1;
  return true;
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!host) return true;
  const allowedHosts = new Set([host, host.replace(/^www\./, ""), `www.${host.replace(/^www\./, "")}`]);

  const check = (value: string | null) => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return allowedHosts.has(url.host);
    } catch {
      return false;
    }
  };

  if (origin && check(origin)) return true;
  if (referer && check(referer)) return true;
  // Same-origin fetch from some browsers may omit Origin on POST; allow when both missing.
  if (!origin && !referer) return true;
  return false;
}

export async function POST(request: Request) {
  try {
    if (!rateLimit(clientKey(request))) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    if (!originAllowed(request)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    const body = (await request.json()) as Body;
    const eventName = asString(body.eventName, 64);

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json(
        { error: "Event not allowed. Purchase must be sent from the order API." },
        { status: 400 },
      );
    }

    if (eventName === "Purchase") {
      return NextResponse.json({ error: "Purchase relay forbidden" }, { status: 403 });
    }

    const marketingConsent =
      typeof body.marketingConsent === "boolean"
        ? body.marketingConsent
        : parseMarketingConsentFromBody({ marketingConsent: body.marketingConsent });

    if (marketingConsent === false) {
      return NextResponse.json({ ok: true, skipped: "marketing_consent_denied" });
    }

    const eventId = asString(body.eventId, MAX_EVENT_ID_LEN);
    const productId = asString(body.productId, MAX_PRODUCT_ID_LEN);
    const value = asNumber(body.value);
    const quantity = asNumber(body.quantity);

    if (!eventId) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }
    if (!productId || productId.length < 8 || productId.length > MAX_PRODUCT_ID_LEN) {
      return NextResponse.json({ error: "Missing or invalid productId" }, { status: 400 });
    }
    if (value == null || value < 0 || value > MAX_VALUE) {
      return NextResponse.json({ error: "Missing or invalid value" }, { status: 400 });
    }
    if (quantity == null || quantity < 1 || quantity > MAX_QUANTITY || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: "Missing or invalid quantity" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Unknown productId" }, { status: 400 });
    }

    const unitPrice = asNumber(body.unitPrice);
    if (unitPrice != null && (unitPrice < 0 || unitPrice > MAX_VALUE)) {
      return NextResponse.json({ error: "Invalid unitPrice" }, { status: 400 });
    }

    const sent = await sendMetaCapiEvent({
      eventName: eventName as MetaCapiEventName,
      eventId,
      eventSourceUrl: asString(body.eventSourceUrl, 2000),
      productName: asString(body.productName, 200),
      commerce: {
        productId,
        value,
        quantity,
        unitPrice: unitPrice ?? undefined,
      },
      user: {
        phone: asString(body.user?.phone, 20),
        firstName: asString(body.user?.firstName, 80),
        fullName: asString(body.user?.fullName, 120),
        city: asString(body.user?.city, 80),
        externalId: asString(body.user?.externalId, 128),
        fbp: sanitizeMetaBrowserIdFromBody(body.fbp, "fbp"),
        fbc: sanitizeMetaBrowserIdFromBody(body.fbc, "fbc"),
        clientIpAddress: clientIpFromRequest(request),
        clientUserAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ ok: sent });
  } catch (error) {
    console.error("[api/meta/events]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to send event" }, { status: 500 });
  }
}
