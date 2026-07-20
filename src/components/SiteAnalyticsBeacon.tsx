"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Internal storefront view counter for the admin dashboard.
 * Completely separate from Meta Pixel — does not call fbq or change ad events.
 */
export function SiteAnalyticsBeacon() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastSent.current === pathname) return;

    const sessionKey = `site_view:${pathname}`;
    try {
      if (sessionStorage.getItem(sessionKey)) {
        lastSent.current = pathname;
        return;
      }
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // sessionStorage may be blocked; still record once per mount path
    }

    lastSent.current = pathname;
    const payload = JSON.stringify({ path: pathname });

    void fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
