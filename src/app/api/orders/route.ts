import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { parseOrderInput } from "@/lib/order-admin";
import { serializeOrder } from "@/lib/order-serialize";
import { readMetaBrowserId } from "@/lib/meta-browser-cookies-server";
import { clientIpFromRequest, sendMetaCapiEvent } from "@/lib/meta-capi-server";

function readMetaString(body: Record<string, unknown>, key: string): string | null {
  const meta = body.meta;
  if (!meta || typeof meta !== "object") return null;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      include: { product: true },
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
      },
      include: { product: true },
    });

    if (!isAdmin) {
      const purchaseValue = Number(order.totalPrice);
      void sendMetaCapiEvent({
        eventName: "Purchase",
        eventId: order.id,
        eventTime: Math.floor(order.createdAt.getTime() / 1000),
        eventSourceUrl: readMetaString(body, "eventSourceUrl"),
        productName: readMetaString(body, "productName"),
        commerce: {
          productId: order.productId,
          value: purchaseValue,
          quantity: order.quantity,
          unitPrice: purchaseValue / order.quantity,
        },
        user: {
          phone: order.phone,
          fullName: order.customerName,
          city: order.city,
          externalId: order.id,
          fbp: readMetaBrowserId(body.meta, "fbp"),
          fbc: readMetaBrowserId(body.meta, "fbc"),
          clientIpAddress: clientIpFromRequest(request),
          clientUserAgent: request.headers.get("user-agent"),
        },
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
