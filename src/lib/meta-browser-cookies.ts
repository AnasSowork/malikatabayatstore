/** Read Meta browser cookies verbatim — do not decode or trim (Meta rejects modified fbc/fbp). */

const META_SAVED_FBP = "meta_saved_fbp";
const META_SAVED_FBC = "meta_saved_fbc";

function readRawCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!match?.[1]) return null;
  return match[1];
}

function saveFirstTouch(key: string, value: string) {
  if (typeof sessionStorage === "undefined") return;
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, value);
  }
}

/** fbc must stay exactly as the Pixel set it: fb.{subdomainIndex}.{time}.{fbclid} */
export function isValidMetaFbc(value: string): boolean {
  return /^fb\.\d+\.\d+\..+$/.test(value);
}

export function isValidMetaFbp(value: string): boolean {
  return /^fb\.\d+\.\d+\.\d+$/.test(value);
}

export function sanitizeMetaBrowserId(
  value: string | null | undefined,
  kind: "fbp" | "fbc",
): string | null {
  if (!value) return null;
  const valid = kind === "fbc" ? isValidMetaFbc(value) : isValidMetaFbp(value);
  return valid ? value : null;
}

/**
 * Returns first-touch fbp/fbc for this session. Values are never decoded or modified.
 * Persists the first valid cookie values so checkout CAPI matches landing Pixel events.
 */
export function getMetaBrowserIds(): { fbp: string | null; fbc: string | null } {
  const cookieFbp = sanitizeMetaBrowserId(readRawCookie("_fbp"), "fbp");
  const cookieFbc = sanitizeMetaBrowserId(readRawCookie("_fbc"), "fbc");

  if (cookieFbp) saveFirstTouch(META_SAVED_FBP, cookieFbp);
  if (cookieFbc) saveFirstTouch(META_SAVED_FBC, cookieFbc);

  const savedFbp =
    typeof sessionStorage !== "undefined"
      ? sanitizeMetaBrowserId(sessionStorage.getItem(META_SAVED_FBP), "fbp")
      : null;
  const savedFbc =
    typeof sessionStorage !== "undefined"
      ? sanitizeMetaBrowserId(sessionStorage.getItem(META_SAVED_FBC), "fbc")
      : null;

  return {
    fbp: savedFbp ?? cookieFbp,
    fbc: savedFbc ?? cookieFbc,
  };
}

/** Call as early as possible after Pixel may have set cookies. */
export function captureMetaBrowserIds() {
  getMetaBrowserIds();

  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return;
  if (sessionStorage.getItem(META_SAVED_FBC)) return;

  const hasFbclid = new URLSearchParams(window.location.search).has("fbclid");
  if (!hasFbclid) return;

  let attempts = 0;
  const poll = window.setInterval(() => {
    attempts += 1;
    const fbc = sanitizeMetaBrowserId(readRawCookie("_fbc"), "fbc");
    if (fbc) {
      saveFirstTouch(META_SAVED_FBC, fbc);
      window.clearInterval(poll);
      return;
    }
    if (attempts >= 50) window.clearInterval(poll);
  }, 100);
}
