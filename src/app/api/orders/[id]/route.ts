import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { parseOrderInput } from "@/lib/order-admin";
import { serializeOrder } from "@/lib/order-serialize";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = await parseOrderInput(body, {
      allowCustomTotalPrice: true,
      allowAdminFields: true,
    });
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const statusChanged = parsed.status != null && parsed.status !== existing.status;

    const order = await prisma.order.update({
      where: { id },
      data: {
        customerName: parsed.customerName,
        phone: parsed.phone,
        city: parsed.city,
        productId: parsed.productId,
        selectedColor: parsed.selectedColor,
        quantity: parsed.quantity,
        totalPrice: parsed.totalPrice,
        lineItems: parsed.lineItems,
        ...(parsed.status != null ? { status: parsed.status } : {}),
        ...(parsed.statusNote !== undefined ? { statusNote: parsed.statusNote } : {}),
        ...(statusChanged ? { statusUpdatedAt: new Date() } : {}),
        ...(parsed.streetAddress !== undefined ? { streetAddress: parsed.streetAddress } : {}),
        ...(parsed.shippingComment !== undefined ? { shippingComment: parsed.shippingComment } : {}),
        ...(parsed.shippingDescription !== undefined
          ? { shippingDescription: parsed.shippingDescription }
          : {}),
        ...(parsed.shippingNoOpen !== undefined ? { shippingNoOpen: parsed.shippingNoOpen } : {}),
      },
      include: { product: true },
    });

    return NextResponse.json(serializeOrder(order));
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
