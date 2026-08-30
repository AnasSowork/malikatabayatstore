import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { isMetaCapiConfigured } from "@/lib/meta-capi-server";
import { loadMetaPurchaseDiagnostics } from "@/lib/meta-backfill";

export const runtime = "nodejs";

/** Admin funnel diagnostics: Purchase delivery vs Meta. */
export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "100");

    const diagnostics = await loadMetaPurchaseDiagnostics(
      Number.isFinite(limit) ? limit : 100,
    );

    return NextResponse.json({
      ok: true,
      metaCapiConfigured: isMetaCapiConfigured(),
      diagnostics,
    });
  } catch (error) {
    console.error("[admin/meta-events/diagnostics]", error);
    return NextResponse.json({ error: "Failed to load Meta diagnostics" }, { status: 500 });
  }
}
