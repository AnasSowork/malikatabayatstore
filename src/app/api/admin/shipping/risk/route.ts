import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

/** Admin-only: COD risk hint from local order history (replaces legacy carrier blacklist). */
export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const phone = normalizePhone(new URL(request.url).searchParams.get("phone") ?? "");
    if (phone.length < 10) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }

    const [returnedCount, deliveredCount, cancelledCount] = await Promise.all([
      prisma.order.count({ where: { phone: { endsWith: phone }, status: "RETURNED" } }),
      prisma.order.count({ where: { phone: { endsWith: phone }, status: "DELIVERED" } }),
      prisma.order.count({ where: { phone: { endsWith: phone }, status: "CANCELLED" } }),
    ]);

    const risky = returnedCount > 0 || cancelledCount >= 2;

    return NextResponse.json({
      risky,
      returnedCount,
      deliveredCount,
      cancelledCount,
    });
  } catch (error) {
    console.error("[admin/shipping/risk]", error);
    return NextResponse.json({ error: "Failed to check customer risk." }, { status: 500 });
  }
}
