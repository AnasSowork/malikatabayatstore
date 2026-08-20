/**
 * Storefront consent preferences.
 * Meta Pixel / CAPI marketing events require `marketing: true`.
 */

export const CONSENT_STORAGE_KEY = "malikat_consent_v1";

export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export const DEFAULT_CONSENT: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: "",
};

export function readConsentPreferences(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences>;
    if (typeof parsed.marketing !== "boolean" || typeof parsed.analytics !== "boolean") {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsentPreferences(
  input: Pick<ConsentPreferences, "analytics" | "marketing">,
): ConsentPreferences {
  const next: ConsentPreferences = {
    necessary: true,
    analytics: Boolean(input.analytics),
    marketing: Boolean(input.marketing),
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("malikat-consent-changed", { detail: next }));
  }
  return next;
}

export function hasMarketingConsent(): boolean {
  return Boolean(readConsentPreferences()?.marketing);
}

export function parseMarketingConsentFromBody(meta: unknown): boolean | null {
  if (!meta || typeof meta !== "object") return null;
  const value = (meta as Record<string, unknown>).marketingConsent;
  if (typeof value === "boolean") return value;
  return null;
}
