import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysAgoUtc, utcDayStart } from "@/lib/site-analytics";

export const runtime = "nodejs";

function sumViews(
  rows: Array<{ views: number; pathType: string }>,
  pathType?: string,
) {
  return rows
    .filter((row) => (pathType ? row.pathType === pathType : true))
    .reduce((sum, row) => sum + row.views, 0);
}

/**
 * Read-only traffic + order KPIs for the admin dashboard.
 * Never mutates Order/Product rows.
 */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = utcDayStart();
    const day7 = daysAgoUtc(6);
    const day30 = daysAgoUtc(29);
    const prev7Start = daysAgoUtc(13);
    const prev7End = daysAgoUtc(7);

    const [metrics30, orders30, topProducts] = await Promise.all([
      prisma.siteDailyMetric.findMany({
        where: { day: { gte: day30 } },
        select: { day: true, pathType: true, productId: true, views: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: day30 } },
        select: { createdAt: true, totalPrice: true, productId: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.siteDailyMetric.findMany({
        where: {
          day: { gte: day7 },
          pathType: "product",
          productId: { not: "" },
        },
        select: { productId: true, views: true },
      }),
    ]);

    const todayKey = today.toISOString().slice(0, 10);
    const metricsToday = metrics30.filter((m) => m.day.toISOString().slice(0, 10) === todayKey);
    const metrics7 = metrics30.filter((m) => m.day >= day7);
    const metricsPrev7 = metrics30.filter((m) => m.day >= prev7Start && m.day <= prev7End);

    const viewsToday = sumViews(metricsToday);
    const views7d = sumViews(metrics7);
    const views30d = sumViews(metrics30);
    const viewsPrev7d = sumViews(metricsPrev7);
    const productViews7d = sumViews(metrics7, "product");
    const homeViews7d = sumViews(metrics7, "home");

    const ordersToday = orders30.filter((o) => o.createdAt >= today);
    const orders7d = orders30.filter((o) => o.createdAt >= day7);
    const revenueToday = ordersToday.reduce((s, o) => s + Number(o.totalPrice), 0);
    const revenue7d = orders7d.reduce((s, o) => s + Number(o.totalPrice), 0);

    const conversion7d =
      views7d > 0 ? (orders7d.length / views7d) * 100 : orders7d.length > 0 ? 100 : 0;

    const productViewMap = new Map<string, number>();
    for (const row of topProducts) {
      productViewMap.set(row.productId, (productViewMap.get(row.productId) ?? 0) + row.views);
    }
    const topProductViews = [...productViewMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, views]) => ({ productId, views }));

    const daily: Array<{ day: string; views: number; orders: number; revenue: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgoUtc(i);
      const key = d.toISOString().slice(0, 10);
      const dayMetrics = metrics30.filter((m) => m.day.toISOString().slice(0, 10) === key);
      const dayOrders = orders30.filter((o) => o.createdAt.toISOString().slice(0, 10) === key);
      daily.push({
        day: key,
        views: sumViews(dayMetrics),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + Number(o.totalPrice), 0),
      });
    }

    return NextResponse.json({
      viewsToday,
      views7d,
      views30d,
      viewsPrev7d,
      productViews7d,
      homeViews7d,
      ordersToday: ordersToday.length,
      orders7d: orders7d.length,
      revenueToday,
      revenue7d,
      conversion7d,
      topProductViews,
      daily,
    });
  } catch (e) {
    console.error("[admin/analytics]", e);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
