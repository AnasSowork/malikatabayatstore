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

  // The unprefixed URL is rewritten to /fr or /en. That internal request must render,
  // not bounce back to `/`, or the browser never receives the page.
  const prefixed = pathname.match(/^\/(fr|en)(?=\/|$)/);
  if (prefixed) {
    const headers = new Headers(request.headers);
    headers.set("X-NEXT-INTL-LOCALE", prefixed[1]);
    return NextResponse.next({ request: { headers } });
  }

  // First visits land in French, including browsers that ask for English.
  // nira_locale marks that this browser has been through that landing once.
  // After that, a saved fr/en choice from the language switcher is kept.
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const landed = request.cookies.get("nira_locale")?.value === "1";
  const chosen =
    landed && (cookieLocale === "fr" || cookieLocale === "en") ? cookieLocale : routing.defaultLocale;
  if (!landed || cookieLocale !== chosen) {
    request.cookies.set("NEXT_LOCALE", chosen);
    const response = intlMiddleware(request);
    const cookie = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 365 };
    response.cookies.set("NEXT_LOCALE", chosen, cookie);
    response.cookies.set("nira_locale", "1", cookie);
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
