import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { serializeOrder } from "@/lib/order-serialize";
import { serializeProduct } from "@/lib/product-serialize";
import { toOrderLineItems } from "@/lib/bundle-offers";
import {
  buildOlivraisonCreatePackage,
  validateOrderForShipping,
} from "@/lib/order-shipping";
import { isOlivraisonConfigured, olivraisonRequest } from "@/lib/olivraison";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

type CreatePackageResponse = {
  trackingID?: string;
  data?: { trackingID?: string };
};

function extractTrackingId(response: CreatePackageResponse): string | null {
  return response.trackingID?.trim() || response.data?.trackingID?.trim() || null;
}

export async function POST(_request: Request, context: Ctx) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isOlivraisonConfigured()) {
      return NextResponse.json(
        { error: "Olivraison credentials are not configured." },
        { status: 503 },
      );
    }

    const { id } = await context.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.olivraisonTrackingId) {
      return NextResponse.json(
        { error: "Order already sent to Olivraison.", trackingID: order.olivraisonTrackingId },
        { status: 409 },
      );
    }

    const product = serializeProduct(order.product);
    const shippingOrder = {
      id: order.id,
      customerName: order.customerName,
      phone: order.phone,
      city: order.city,
      quantity: order.quantity,
      totalPrice: order.totalPrice.toString(),
      lineItems: toOrderLineItems(order.lineItems),
      streetAddress: order.streetAddress,
      shippingComment: order.shippingComment,
      shippingDescription: order.shippingDescription,
      shippingNoOpen: order.shippingNoOpen,
      product,
    };

    const validationError = validateOrderForShipping(shippingOrder);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const payload = buildOlivraisonCreatePackage(shippingOrder);
    const response = await olivraisonRequest<CreatePackageResponse>("/package/new", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const trackingID = extractTrackingId(response);
    if (!trackingID) {
      return NextResponse.json(
        { error: "Olivraison did not return a tracking ID." },
        { status: 502 },
      );
    }

    const now = new Date();
    const updated = await prisma.order.update({
      where: { id },
      data: {
        olivraisonTrackingId: trackingID,
        shippedAt: now,
        status: "SHIPPED",
        statusUpdatedAt: now,
      },
      include: { product: true },
    });

    return NextResponse.json({
      ok: true,
      trackingID,
      status: updated.status,
      order: serializeOrder(updated),
    });
  } catch (error) {
    console.error("[orders/ship]", error);
    const message = error instanceof Error ? error.message : "Failed to send order to Olivraison.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
