/** First-touch ad click attribution — captured before consent / Pixel load. */

export const META_FIRST_TOUCH_FBCLID_KEY = "meta_first_touch_fbclid";
export const META_FIRST_TOUCH_LANDING_URL_KEY = "meta_first_touch_landing_url";

/**
 * Store raw fbclid and landing URL on first page view.
 * fbclid must stay verbatim (case-sensitive) per Meta CAPI docs.
 */
export function captureFirstTouchMetaAttribution(): void {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return;

  try {
    if (!sessionStorage.getItem(META_FIRST_TOUCH_LANDING_URL_KEY)) {
      sessionStorage.setItem(META_FIRST_TOUCH_LANDING_URL_KEY, window.location.href);
    }

    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (fbclid && !sessionStorage.getItem(META_FIRST_TOUCH_FBCLID_KEY)) {
      sessionStorage.setItem(META_FIRST_TOUCH_FBCLID_KEY, fbclid);
    }
  } catch {
    /* sessionStorage blocked */
  }
}

export function readFirstTouchFbclid(): string | null {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return null;
  try {
    const value = sessionStorage.getItem(META_FIRST_TOUCH_FBCLID_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function readFirstTouchLandingUrl(): string | null {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return null;
  try {
    const value = sessionStorage.getItem(META_FIRST_TOUCH_LANDING_URL_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}
