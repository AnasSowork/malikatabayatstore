import { NextResponse } from "next/server";
import {
  clientIpFromRequest,
  sendMetaCapiEvent,
  type MetaCapiEventName,
} from "@/lib/meta-capi-server";

export const runtime = "nodejs";

const ALLOWED_EVENTS = new Set<MetaCapiEventName>([
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
]);

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
  user?: {
    email?: unknown;
    phone?: unknown;
    firstName?: unknown;
    fullName?: unknown;
    city?: unknown;
    externalId?: unknown;
  };
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const eventName = asString(body.eventName);
    if (!eventName || !ALLOWED_EVENTS.has(eventName as MetaCapiEventName)) {
      return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
    }

    const eventId = asString(body.eventId);
    const productId = asString(body.productId);
    const value = asNumber(body.value);
    const quantity = asNumber(body.quantity);

    if (!eventId) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }
    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }
    if (value == null || value < 0) {
      return NextResponse.json({ error: "Missing or invalid value" }, { status: 400 });
    }
    if (quantity == null || quantity < 1) {
      return NextResponse.json({ error: "Missing or invalid quantity" }, { status: 400 });
    }

    const sent = await sendMetaCapiEvent({
      eventName: eventName as MetaCapiEventName,
      eventId,
      eventSourceUrl: asString(body.eventSourceUrl),
      productName: asString(body.productName),
      commerce: {
        productId,
        value,
        quantity,
        unitPrice: asNumber(body.unitPrice) ?? undefined,
      },
      user: {
        email: asString(body.user?.email),
        phone: asString(body.user?.phone),
        firstName: asString(body.user?.firstName),
        fullName: asString(body.user?.fullName),
        city: asString(body.user?.city),
        externalId: asString(body.user?.externalId),
        fbp: asString(body.fbp),
        fbc: asString(body.fbc),
        clientIpAddress: clientIpFromRequest(request),
        clientUserAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ ok: sent });
  } catch (error) {
    console.error("[api/meta/events]", error);
    return NextResponse.json({ error: "Failed to send event" }, { status: 500 });
  }
}
