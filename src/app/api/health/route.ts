import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Safe DB connectivity check for production debugging (no secrets returned). */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `;
    return NextResponse.json({
      ok: true,
      db: "connected",
      tables: Number(tables[0]?.n ?? 0),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, db: "error", message }, { status: 500 });
  }
}
