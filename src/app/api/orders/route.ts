import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { parseOrderInput } from "@/lib/order-admin";
import { serializeOrder } from "@/lib/order-serialize";
import { readMetaBrowserId } from "@/lib/meta-browser-cookies-server";
import { parseMarketingConsentFromBody } from "@/lib/consent";
import { purchaseEventId } from "@/lib/meta-event-id";
import {
  hashOrderPiiForCapi,
  resolveMetaCapiUserFromRequest,
} from "@/lib/meta-param-builder-server";
import {
  scheduleOrderStatusTransition,
  sendOrRetryMetaOrderEvent,
} from "@/lib/order-lifecycle-analytics";
import { sanitizeUtmFromBody } from "@/lib/meta-utm";

function readMetaString(body: Record<string, unknown>, key: string): string | null {
  const meta = body.meta;
  if (!meta || typeof meta !== "object") return null;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 2000) : null;
}

/** fbclid and landing URLs must reach CAPI verbatim (Meta rejects modified fbc). */
function readMetaVerbatimString(body: Record<string, unknown>, key: string): string | null {
  const meta = body.meta;
  if (!meta || typeof meta !== "object") return null;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value.slice(0, 4000) : null;
}

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      include: { product: true, metaEventLogs: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders.map(serializeOrder));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const isAdmin = await isAdminAuthenticated();
    const parsed = await parseOrderInput(body, {
      allowCustomTotalPrice: isAdmin,
      allowAdminFields: isAdmin,
    });
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const meta = body.meta;
    const utm = sanitizeUtmFromBody(meta);
    let metaFbp = readMetaBrowserId(meta, "fbp");
    let metaFbc = readMetaBrowserId(meta, "fbc");
    const marketingConsent = parseMarketingConsentFromBody(meta);

    const capiContext = !isAdmin
      ? resolveMetaCapiUserFromRequest(request, {
          fbclid: readMetaVerbatimString(body, "fbclid"),
          landingEventSourceUrl: readMetaVerbatimString(body, "landingEventSourceUrl"),
          checkoutEventSourceUrl: readMetaString(body, "eventSourceUrl"),
          clientFbp: metaFbp,
          clientFbc: metaFbc,
          phone: parsed.phone,
          fullName: parsed.customerName,
          city: parsed.city,
        })
      : null;

    if (capiContext) {
      metaFbp = metaFbp ?? capiContext.fbp;
      metaFbc = metaFbc ?? capiContext.fbc;
    }

    const order = await prisma.order.create({
      data: {
        customerName: parsed.customerName,
        phone: parsed.phone,
        city: parsed.city,
        productId: parsed.productId,
        selectedColor: parsed.selectedColor,
        quantity: parsed.quantity,
        totalPrice: parsed.totalPrice,
        lineItems: parsed.lineItems,
        status: parsed.status ?? "PENDING",
        statusNote: parsed.statusNote ?? null,
        statusUpdatedAt: parsed.status ? new Date() : null,
        streetAddress: parsed.streetAddress ?? null,
        shippingComment: parsed.shippingComment ?? null,
        shippingDescription: parsed.shippingDescription ?? null,
        shippingNoOpen: parsed.shippingNoOpen ?? false,
        metaFbp,
        metaFbc,
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
        utmContent: utm.utmContent,
        utmTerm: utm.utmTerm,
        marketingConsent: marketingConsent ?? undefined,
      },
      include: { product: true, metaEventLogs: true },
    });

    // Meta must never block checkout success — await send so Passenger finishes before response ends.
    if (!isAdmin) {
      try {
        await sendOrRetryMetaOrderEvent({
          order,
          eventName: "Purchase",
          eventId: purchaseEventId(order.id),
          eventTime: Math.floor(order.createdAt.getTime() / 1000),
          eventSourceUrl: capiContext?.eventSourceUrl ?? readMetaString(body, "eventSourceUrl"),
          referrerUrl: capiContext?.referrerUrl ?? null,
          productName: readMetaString(body, "productName"),
          clientIpAddress: capiContext?.clientIpAddress ?? null,
          clientUserAgent: capiContext?.clientUserAgent ?? request.headers.get("user-agent"),
          paramBuilderHashed: hashOrderPiiForCapi(order),
          fbp: metaFbp,
          fbc: metaFbc,
        });
      } catch (metaError) {
        console.error(
          "[api/orders] Meta Purchase send failed",
          metaError instanceof Error ? metaError.message : metaError,
        );
      }
    } else {
      // Admin-created non-PENDING statuses still need lifecycle analytics once.
      scheduleOrderStatusTransition({
        order,
        fromStatus: null,
        toStatus: order.status,
      });
    }

    return NextResponse.json(serializeOrder(order), { status: 201 });
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
