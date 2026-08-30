import { NextResponse } from "next/server";
import { clientIpFromRequest, preferIpv6FromForwarded } from "@/lib/meta-request-ip";

export const runtime = "nodejs";

/** Returns client IP for Meta `_fbi` cookie (client ParamBuilder getIpFn). */
export async function GET(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    preferIpv6FromForwarded(forwarded) ??
    clientIpFromRequest(request);

  if (!ip) {
    return NextResponse.json({ ip: null }, { status: 204 });
  }

  return NextResponse.json(
    { ip },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
