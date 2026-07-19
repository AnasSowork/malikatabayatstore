import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { parseProductPayload } from "@/lib/parse-product-payload";
import { serializeProduct } from "@/lib/product-serialize";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products.map(serializeProduct));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseProductPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const d = parsed.data;

    const product = await prisma.product.create({
      data: {
        name: d.name,
        nameAr: d.nameAr,
        nameFr: d.nameFr,
        sku: d.sku,
        price: d.price,
        compareAtPrice: d.compareAtPrice,
        stockQuantity: d.stockQuantity,
        soldCount: d.soldCount,
        rating: d.rating,
        reviewCount: d.reviewCount,
        description: d.description,
        descriptionAr: d.descriptionAr,
        descriptionFr: d.descriptionFr,
        categories: d.categoryList,
        images: d.imageList,
        colorVariants: d.colorList,
        bundleOffers: d.bundleOffers,
        availableSizes: d.availableSizes,
        detailContent: d.detailContent,
      },
    });

    return NextResponse.json(serializeProduct(product), { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
