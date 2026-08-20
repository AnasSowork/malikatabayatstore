/** First-touch UTM attribution for the storefront session. */

export const META_UTM_STORAGE_KEY = "meta_first_touch_utm";

export type MetaUtmAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

const EMPTY: MetaUtmAttribution = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
};

function readParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  if (!value) return null;
  return value.slice(0, 180);
}

export function parseUtmFromSearch(search: string): MetaUtmAttribution | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const next: MetaUtmAttribution = {
    utmSource: readParam(params, "utm_source"),
    utmMedium: readParam(params, "utm_medium"),
    utmCampaign: readParam(params, "utm_campaign"),
    utmContent: readParam(params, "utm_content"),
    utmTerm: readParam(params, "utm_term"),
  };
  const hasAny = Object.values(next).some(Boolean);
  return hasAny ? next : null;
}

export function readStoredUtm(): MetaUtmAttribution {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = sessionStorage.getItem(META_UTM_STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<MetaUtmAttribution>;
    return {
      utmSource: typeof parsed.utmSource === "string" ? parsed.utmSource : null,
      utmMedium: typeof parsed.utmMedium === "string" ? parsed.utmMedium : null,
      utmCampaign: typeof parsed.utmCampaign === "string" ? parsed.utmCampaign : null,
      utmContent: typeof parsed.utmContent === "string" ? parsed.utmContent : null,
      utmTerm: typeof parsed.utmTerm === "string" ? parsed.utmTerm : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Capture first-touch UTMs only — never overwrite an existing session attribution. */
export function captureFirstTouchUtmFromLocation(): MetaUtmAttribution {
  if (typeof window === "undefined") return { ...EMPTY };
  const existing = readStoredUtm();
  if (Object.values(existing).some(Boolean)) return existing;

  const fromUrl = parseUtmFromSearch(window.location.search);
  if (!fromUrl) return { ...EMPTY };

  try {
    sessionStorage.setItem(META_UTM_STORAGE_KEY, JSON.stringify(fromUrl));
  } catch {
    /* sessionStorage may be blocked */
  }
  return fromUrl;
}

export function sanitizeUtmFromBody(meta: unknown): MetaUtmAttribution {
  if (!meta || typeof meta !== "object") return { ...EMPTY };
  const record = meta as Record<string, unknown>;
  const read = (key: string) => {
    const value = record[key];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 180) : null;
  };
  return {
    utmSource: read("utmSource"),
    utmMedium: read("utmMedium"),
    utmCampaign: read("utmCampaign"),
    utmContent: read("utmContent"),
    utmTerm: read("utmTerm"),
  };
}
