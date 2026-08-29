import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { senditShippingProvider } from "@/lib/shipping/providers/sendit";
import { listSenditCityNames } from "@/lib/shipping/providers/sendit-cities";
import { SenditApiError } from "@/lib/shipping/providers/sendit-client";

export const runtime = "nodejs";

/** Admin-only: Sendit city names for order form autocomplete. */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!senditShippingProvider.isConfigured()) {
      return NextResponse.json({ error: "Sendit is not configured.", cities: [] }, { status: 503 });
    }

    const cities = await listSenditCityNames();
    return NextResponse.json({ cities });
  } catch (error) {
    if (error instanceof SenditApiError) {
      return NextResponse.json(
        { error: error.message, cities: [] },
        { status: error.httpStatus >= 400 ? error.httpStatus : 502 },
      );
    }
    console.error("[admin/shipping/cities]", error);
    return NextResponse.json({ error: "Failed to load Sendit cities.", cities: [] }, { status: 500 });
  }
}
