/**
 * Files under `public/` are served from the site root. Use `/folder/file.webp`, not
 * `public/...` or disk paths. Spaces should be encoded (%20).
 *
 * Strips an accidental `/<locale>/` prefix before static roots (next-intl does not serve
 * `public/` files under the locale segment).
 */
export function normalizeProductImageSrc(raw: string): string {
  const trimmed = raw.trim().replace(/\\/g, "/");
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  let path = trimmed;
  const lower = path.toLowerCase();
  const pub = "/public/";
  const i = lower.indexOf(pub);
  if (i !== -1) {
    path = `/${path.slice(i + pub.length)}`;
  } else if (lower.startsWith("public/")) {
    path = `/${path.slice("public/".length)}`;
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  path = path.replace(/\/{2,}/g, "/");

  // Legacy paths move to API file serving to avoid `/[locale]/...` route collisions.
  path = path.replace(/^\/uploads\/products\//, "/api/uploads/p/");
  path = path.replace(/^\/uploads\/p\//, "/api/uploads/p/");

  path = path.replace(/^\/(ar|en|fr)\/(?=uploads\/|_next\/|api\/)/, "/");
  path = path.replace(/^\/(ar|en|fr)\/(?=body-tee\/)/i, "/");

  try {
    return encodeURI(decodeURI(path));
  } catch {
    return path;
  }
}
