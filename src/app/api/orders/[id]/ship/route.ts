import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { serializeOrder } from "@/lib/order-serialize";
import {
  createShipmentForOrder,
  ShippingAlreadyExistsError,
  ShippingConfigError,
  ShippingNotConfiguredError,
} from "@/lib/shipping";
import { SenditValidationError } from "@/lib/shipping/providers/sendit";
import { SenditApiError } from "@/lib/shipping/providers/sendit-client";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Create a shipment via the active ShippingProvider (default: sendit).
 * No silent fallback to another provider on API failure.
 */
export async function POST(_request: Request, context: Ctx) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { result, order } = await createShipmentForOrder(id);

    return NextResponse.json({
      ok: true,
      trackingID: result.trackingId,
      provider: result.providerId,
      status: order.status,
      order: serializeOrder(order),
    });
  } catch (error) {
    if (error instanceof ShippingConfigError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    if (error instanceof ShippingNotConfiguredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    if (error instanceof ShippingAlreadyExistsError) {
      return NextResponse.json(
        {
          error: "Order already has a shipment.",
          trackingID: error.trackingId,
          code: error.code,
        },
        { status: 409 },
      );
    }
    if (error instanceof SenditValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    if (error instanceof SenditApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus === 401 ? 502 : error.httpStatus >= 400 ? error.httpStatus : 502 },
      );
    }
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (error instanceof Error && error.name === "ShippingValidationError") {
      return NextResponse.json(
        { error: error.message, code: "SHIPPING_VALIDATION" },
        { status: 400 },
      );
    }
    console.error("[orders/ship]", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Failed to create shipment." }, { status: 500 });
  }
}
