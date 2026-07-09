import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { getHomeSection, isHomeSectionKey } from "@/lib/home-content";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    if (!isHomeSectionKey(key)) {
      return NextResponse.json({ error: "Unknown section" }, { status: 404 });
    }
    const section = await getHomeSection(key);
    if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(section);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch section" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { key } = await params;
    if (!isHomeSectionKey(key)) {
      return NextResponse.json({ error: "Unknown section" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const data: Prisma.HomeSectionUpdateInput = {};

    if (typeof body.enabled === "boolean") data.enabled = body.enabled;
    if (body.content !== undefined && body.content !== null && typeof body.content === "object") {
      data.content = body.content as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const row = await prisma.homeSection.update({
      where: { key },
      data,
    });

    return NextResponse.json({
      key: row.key,
      enabled: row.enabled,
      sortOrder: row.sortOrder,
      content: row.content,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}
