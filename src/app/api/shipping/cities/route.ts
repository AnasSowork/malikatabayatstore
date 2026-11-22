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
      searchSenditCitySuggestions(city, 200),
    ]);

    const cities = suggestions.map((district) => {
      const ville = district.ville.trim() || district.name.trim();
      return { id: district.id, name: ville, ville };
    });

    if (match.kind === "EXACT_MATCH" || match.kind === "SAFE_NORMALIZED_MATCH") {
      const cityLabel =
        match.district.ville.trim() || match.district.name.trim();
      return NextResponse.json({
        ok: true,
        configured: true,
        kind: match.kind,
        city: cityLabel,
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
