import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { serializeOrder } from "@/lib/order-serialize";
import { prisma } from "@/lib/prisma";
import { syncShipmentStatus } from "@/lib/shipping/sync";
import { SenditApiError } from "@/lib/shipping/providers/sendit-client";
import { ShippingNotConfiguredError } from "@/lib/shipping/provider";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ orderId: string }> };

/**
 * Admin: pull authoritative Sendit status and apply allowed transitions.
 */
export async function POST(_request: Request, context: Ctx) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await context.params;
    if (!orderId?.trim()) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const result = await syncShipmentStatus(orderId.trim());

    const order = await prisma.order.findUnique({
      where: { id: orderId.trim() },
      include: { product: true, metaEventLogs: true },
    });

    return NextResponse.json({
      ok: true,
      applied: result.applied,
      fromStatus: result.fromStatus,
      toStatus: result.toStatus,
      reason: result.reason ?? null,
      shipping: result.shipping
        ? {
            provider: result.shipping.providerId,
            trackingId: result.shipping.trackingId,
            normalizedStatus: result.shipping.normalizedStatus,
            rawStatus: result.shipping.rawStatus,
          }
        : null,
      order: order ? serializeOrder(order) : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (error instanceof ShippingNotConfiguredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    if (error instanceof SenditApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 502 },
      );
    }
    console.error("[admin/shipping/sync]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to sync shipping status" }, { status: 500 });
  }
}
