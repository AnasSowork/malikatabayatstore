import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { parseProductPayload } from "@/lib/parse-product-payload";
import { serializeProduct } from "@/lib/product-serialize";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseProductPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const d = parsed.data;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: d.name,
        nameAr: d.nameAr,
        nameFr: d.nameFr,
        price: d.price,
        description: d.description,
        descriptionAr: d.descriptionAr,
        descriptionFr: d.descriptionFr,
        categories: d.categoryList,
        images: d.imageList,
        colorVariants: d.colorList,
        bundleOffers: d.bundleOffers,
      },
    });

    return NextResponse.json(serializeProduct(product));
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete product with existing orders" },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
