import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { isMetaCapiConfigured } from "@/lib/meta-capi-server";
import {
  backfillPurchaseBatch,
  loadMetaPurchaseDiagnostics,
  retimestampPurchaseBatch,
} from "@/lib/meta-backfill";

export const runtime = "nodejs";

/**
 * Admin-only: re-send Purchase CAPI for FAILED / missing / consent-skipped orders.
 * `retimestamp: true` re-sends recent backfills with event_time=now (fixes stale timestamps).
 */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isMetaCapiConfigured()) {
      return NextResponse.json(
        { error: "Meta CAPI is not configured on this server" },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const dryRun = body.dryRun === true;
    const limit =
      typeof body.limit === "number" && Number.isFinite(body.limit)
        ? body.limit
        : 50;
    const orderIds = Array.isArray(body.orderIds)
      ? body.orderIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : undefined;

    const retimestamp = body.retimestamp === true;

    if (dryRun) {
      const diagnostics = await loadMetaPurchaseDiagnostics(Math.min(limit, 200));
      const targetIds = orderIds?.length
        ? orderIds
        : diagnostics.candidates.slice(0, limit).map((row) => row.orderId);

      return NextResponse.json({
        ok: true,
        dryRun: true,
        retimestamp,
        wouldProcess: targetIds.length,
        orderIds: targetIds,
        candidates: diagnostics.candidates.filter((row) => targetIds.includes(row.orderId)),
      });
    }

    const batch = retimestamp
      ? await retimestampPurchaseBatch({ limit, delayMs: 150 })
      : await backfillPurchaseBatch({
          orderIds,
          limit,
          delayMs: 150,
        });

    const diagnostics = await loadMetaPurchaseDiagnostics(50);

    return NextResponse.json({
      ok: true,
      dryRun: false,
      batch,
      diagnostics: diagnostics.totals,
    });
  } catch (error) {
    console.error("[admin/meta-events/backfill]", error);
    return NextResponse.json({ error: "Failed to backfill Meta purchases" }, { status: 500 });
  }
}
