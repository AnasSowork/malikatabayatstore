import { NextResponse } from "next/server";
import { senditShippingProvider } from "@/lib/shipping/providers/sendit";
import {
  classifySenditCityMatch,
  searchSenditCitySuggestions,
} from "@/lib/shipping/providers/sendit-cities";
import { SenditApiError } from "@/lib/shipping/providers/sendit-client";

export const runtime = "nodejs";

/** Public checkout: Sendit city suggestions as the customer types. */
export async function GET(request: Request) {
  try {
    if (!senditShippingProvider.isConfigured()) {
      return NextResponse.json({ ok: false, configured: false, cities: [] });
    }

    const city = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (city.length < 2) {
      return NextResponse.json({ ok: false, configured: true, cities: [] });
    }

    const [match, suggestions] = await Promise.all([
      classifySenditCityMatch(city),
      searchSenditCitySuggestions(city, 12),
    ]);

    const cities = suggestions.map((district) => ({
      id: district.id,
      name: district.name.trim() || district.ville.trim(),
      ville: district.ville.trim() || district.name.trim(),
    }));

    if (match.kind === "EXACT_MATCH" || match.kind === "SAFE_NORMALIZED_MATCH") {
      return NextResponse.json({
        ok: true,
        configured: true,
        kind: match.kind,
        city: match.district.name.trim() || match.district.ville.trim(),
        cities,
      });
    }

    return NextResponse.json({
      ok: false,
      configured: true,
      kind: match.kind,
      cities,
    });
  } catch (error) {
    if (error instanceof SenditApiError) {
      return NextResponse.json(
        { ok: false, configured: true, cities: [], error: error.message },
        { status: error.httpStatus >= 400 ? error.httpStatus : 502 },
      );
    }
    console.error("[shipping/cities]", error);
    return NextResponse.json(
      { ok: false, configured: true, cities: [], error: "Failed to search cities." },
      { status: 500 },
    );
  }
}
