import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/uploads/products/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/uploads/products/", "/api/uploads/p/");
    return NextResponse.redirect(url, 308);
  }
  if (pathname.startsWith("/uploads/p/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/uploads/p/", "/api/uploads/p/");
    return NextResponse.redirect(url, 308);
  }

  // Legacy Arabic cookie / Accept-Language: force French when next-intl would otherwise keep "ar".
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale === "ar") {
    const response = intlMiddleware(request);
    response.cookies.set("NEXT_LOCALE", routing.defaultLocale, { path: "/", sameSite: "lax" });
    return response;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/uploads/products/:path*",
    "/uploads/p/:path*",
    "/((?!api|_next|_vercel|uploads|.*\\..*).*)",
  ],
};
