import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyStorefrontPath, utcDayStart } from "@/lib/site-analytics";

export const runtime = "nodejs";

type Body = {
  path?: unknown;
};

/**
 * Lightweight storefront page-view counter.
 * Does NOT touch Order, Product, or Meta Pixel data.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    if (typeof body.path !== "string" || body.path.length > 256) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const path = body.path.trim();
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { pathType, productId } = classifyStorefrontPath(path);
    const day = utcDayStart();

    await prisma.siteDailyMetric.upsert({
      where: {
        day_pathType_productId: {
          day,
          pathType,
          productId,
        },
      },
      create: {
        day,
        pathType,
        productId,
        views: 1,
      },
      update: {
        views: { increment: 1 },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[analytics/pageview]", e);
    // Never break the storefront if analytics fails
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
