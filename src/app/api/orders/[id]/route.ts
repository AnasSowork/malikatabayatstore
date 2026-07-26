import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { toOrderLineItems } from "@/lib/bundle-offers";
import { serializeProduct } from "@/lib/product-serialize";
import { parseOrderInput } from "@/lib/order-admin";

function serializeOrder(order: {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  selectedColor: string | null;
  quantity: number;
  totalPrice: { toString(): string };
  lineItems: unknown;
  productId: string;
  createdAt: Date;
  product: Parameters<typeof serializeProduct>[0];
}) {
  return {
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    city: order.city,
    selectedColor: order.selectedColor,
    quantity: order.quantity,
    totalPrice: order.totalPrice.toString(),
    lineItems: toOrderLineItems(order.lineItems),
    productId: order.productId,
    createdAt: order.createdAt.toISOString(),
    product: serializeProduct(order.product),
  };
}

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
    const parsed = await parseOrderInput(body, { allowCustomTotalPrice: true });
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

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
