import { NextResponse } from "next/server";
import { isMetaCapiConfigured } from "@/lib/meta-capi-server";
import { getDbEnvDebug, prisma } from "@/lib/prisma";

/** Safe DB connectivity check for production debugging (no secrets returned). */
export async function GET() {
  const env = getDbEnvDebug();
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
      metaCapi: isMetaCapiConfigured(),
      env,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, db: "error", message, metaCapi: isMetaCapiConfigured(), env },
      { status: 500 },
    );
  }
}
