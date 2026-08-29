import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { senditShippingProvider } from "@/lib/shipping/providers/sendit";
import {
  classifySenditCityMatch,
  SenditCityMappingError,
} from "@/lib/shipping/providers/sendit-cities";
import { SenditApiError } from "@/lib/shipping/providers/sendit-client";

export const runtime = "nodejs";

/** Admin-only: preflight Sendit district mapping for a city name. */
export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!senditShippingProvider.isConfigured()) {
      return NextResponse.json({ error: "Sendit is not configured.", ok: false }, { status: 503 });
    }

    const city = new URL(request.url).searchParams.get("city")?.trim() ?? "";
    if (city.length < 2) {
      return NextResponse.json({ ok: false, kind: "NOT_FOUND", error: "City is too short." }, { status: 400 });
    }

    const result = await classifySenditCityMatch(city);
    if (result.kind === "EXACT_MATCH" || result.kind === "SAFE_NORMALIZED_MATCH") {
      return NextResponse.json({
        ok: true,
        kind: result.kind,
        district: {
          id: result.district.id,
          name: result.district.name,
          ville: result.district.ville,
        },
      });
    }
    if (result.kind === "AMBIGUOUS") {
      return NextResponse.json({
        ok: false,
        kind: result.kind,
        candidates: result.candidates.map((d) => ({
          id: d.id,
          name: d.name,
          ville: d.ville,
        })),
        error: `City "${city}" matches multiple Sendit districts.`,
      });
    }

    return NextResponse.json({
      ok: false,
      kind: "NOT_FOUND",
      error: `City "${city}" is not mapped to a Sendit district.`,
    });
  } catch (error) {
    if (error instanceof SenditCityMappingError) {
      return NextResponse.json({ ok: false, kind: error.matchKind, error: error.message });
    }
    if (error instanceof SenditApiError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.httpStatus >= 400 ? error.httpStatus : 502 },
      );
    }
    console.error("[admin/shipping/validate-city]", error);
    return NextResponse.json({ ok: false, error: "Failed to validate city." }, { status: 500 });
  }
}
