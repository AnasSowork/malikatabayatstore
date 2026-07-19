import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { findBundleOffer, toOrderLineItems, type OrderLineItem } from "@/lib/bundle-offers";
import { serializeProduct } from "@/lib/product-serialize";

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

function normalizeMoroccanPhone(value: string): string | null {
  let normalized = value.replace(/[\s.-]/g, "");
  if (normalized.startsWith("+212")) normalized = `0${normalized.slice(4)}`;
  if (normalized.startsWith("00212")) normalized = `0${normalized.slice(5)}`;
  return /^0[5-7][0-9]{8}$/.test(normalized) ? normalized : null;
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
    const body = await request.json();
    const {
      customerName,
      phone,
      city,
      productId,
      selectedColor,
      quantity: rawQuantity,
      lineItems: rawLineItems,
    } = body as Record<string, unknown>;

    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof city !== "string" ||
      !city.trim() ||
      typeof productId !== "string" ||
      !productId.trim()
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedPhone = normalizeMoroccanPhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Invalid Moroccan phone number" }, { status: 400 });
    }

    const quantity =
      typeof rawQuantity === "number" && Number.isInteger(rawQuantity) && rawQuantity >= 1
        ? rawQuantity
        : 1;

    const product = await prisma.product.findUnique({
      where: { id: productId.trim() },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }

    const serialized = serializeProduct(product);
    const bundle = findBundleOffer(serialized.bundleOffers, quantity);
    if (!bundle) {
      return NextResponse.json({ error: "Invalid bundle quantity" }, { status: 400 });
    }

    const variantNames = serialized.colorVariants.map((v) => v.name);
    const availableSizes = serialized.availableSizes;
    const defaultSize = availableSizes[0] ?? "M";
    let lineItems: OrderLineItem[] = toOrderLineItems(rawLineItems);

    if (lineItems.length === 0 && typeof selectedColor === "string" && selectedColor.trim()) {
      lineItems = [{ size: defaultSize, color: selectedColor.trim() }];
    }

    if (lineItems.length !== quantity) {
      return NextResponse.json(
        { error: "Line items must match selected quantity" },
        { status: 400 },
      );
    }

    for (const item of lineItems) {
      if (!availableSizes.includes(item.size)) {
        return NextResponse.json({ error: "Invalid size" }, { status: 400 });
      }
      if (variantNames.length > 0) {
        if (!item.color || !variantNames.includes(item.color)) {
          return NextResponse.json({ error: "Invalid color variant" }, { status: 400 });
        }
      }
    }

    const primaryColor = lineItems[0]?.color ?? null;

    const order = await prisma.order.create({
      data: {
        customerName: customerName.trim(),
        phone: normalizedPhone,
        city: city.trim(),
        productId: productId.trim(),
        selectedColor: primaryColor,
        quantity,
        totalPrice: bundle.price,
        lineItems,
      },
      include: { product: true },
    });

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
