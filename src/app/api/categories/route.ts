import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { listCategories } from "@/lib/list-categories";
import { serializeCategory } from "@/lib/category-serialize";
import { prisma } from "@/lib/prisma";

function parseCategoryBody(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const nameAr = typeof body.nameAr === "string" ? body.nameAr.trim() || null : null;
  const nameFr = typeof body.nameFr === "string" ? body.nameFr.trim() || null : null;
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.round(body.sortOrder)
      : typeof body.sortOrder === "string" && body.sortOrder.trim()
        ? Math.round(Number(body.sortOrder))
        : 0;

  if (!name) return { ok: false as const, error: "Name is required" };
  if (name.length > 100) return { ok: false as const, error: "Name is too long" };

  return { ok: true as const, data: { name, nameAr, nameFr, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 } };
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({ select: { categories: true } });
    return NextResponse.json(await listCategories(products));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseCategoryBody(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const existing = await prisma.category.findUnique({ where: { name: parsed.data.name } });
    if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });

    const row = await prisma.category.create({ data: parsed.data });
    return NextResponse.json(serializeCategory(row), { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
