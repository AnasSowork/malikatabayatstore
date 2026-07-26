import { isValidMetaFbc, isValidMetaFbp } from "@/lib/meta-browser-cookies";

/** Pass fbp/fbc to CAPI exactly as received from the browser — no trim or decode. */
export function readMetaBrowserId(
  meta: unknown,
  key: "fbp" | "fbc",
): string | null {
  if (!meta || typeof meta !== "object") return null;
  const value = (meta as Record<string, unknown>)[key];
  if (typeof value !== "string" || value.length === 0) return null;
  return key === "fbc" ? (isValidMetaFbc(value) ? value : null) : isValidMetaFbp(value) ? value : null;
}

export function sanitizeMetaBrowserIdFromBody(
  value: unknown,
  kind: "fbp" | "fbc",
): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return kind === "fbc" ? (isValidMetaFbc(value) ? value : null) : isValidMetaFbp(value) ? value : null;
}
