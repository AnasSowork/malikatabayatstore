import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { serializeCategory } from "@/lib/category-serialize";
import { countProductsWithCategory, renameCategoryInProducts } from "@/lib/category-utils";

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

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseCategoryBody(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    if (parsed.data.name !== existing.name) {
      const clash = await prisma.category.findUnique({ where: { name: parsed.data.name } });
      if (clash) return NextResponse.json({ error: "Category already exists" }, { status: 409 });
      await renameCategoryInProducts(existing.name, parsed.data.name);
    }

    const row = await prisma.category.update({ where: { id }, data: parsed.data });
    return NextResponse.json(serializeCategory(row));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const inUse = await countProductsWithCategory(existing.name);
    if (inUse > 0) {
      return NextResponse.json(
        { error: "Category is used by products", productCount: inUse },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
