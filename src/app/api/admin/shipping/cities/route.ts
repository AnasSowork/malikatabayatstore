import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { senditShippingProvider } from "@/lib/shipping/providers/sendit";
import {
  listSenditCityNames,
  listSenditDistricts,
} from "@/lib/shipping/providers/sendit-cities";
import { SenditApiError } from "@/lib/shipping/providers/sendit-client";

export const runtime = "nodejs";

/** Admin-only: Sendit city + district labels for order form autocomplete. */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!senditShippingProvider.isConfigured()) {
      return NextResponse.json(
        { error: "Sendit is not configured.", cities: [], districts: [] },
        { status: 503 },
      );
    }

    const [cities, districts] = await Promise.all([
      listSenditCityNames(),
      listSenditDistricts(),
    ]);
    return NextResponse.json({
      cities,
      districts: districts.map((d) => ({
        id: d.id,
        name: d.name,
        ville: d.ville,
      })),
    });
  } catch (error) {
    if (error instanceof SenditApiError) {
      return NextResponse.json(
        { error: error.message, cities: [], districts: [] },
        { status: error.httpStatus >= 400 ? error.httpStatus : 502 },
      );
    }
    console.error("[admin/shipping/cities]", error);
    return NextResponse.json(
      { error: "Failed to load Sendit cities.", cities: [], districts: [] },
      { status: 500 },
    );
  }
}
