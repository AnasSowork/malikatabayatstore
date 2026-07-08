const EXT_FOR_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export function extForMime(mime: string): string | null {
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return EXT_FOR_MIME[base] ?? null;
}

/** macOS / Windows often send empty type for “picked” files — infer from name. */
export function extFromFilename(filename: string): string | null {
  const m = /\.(jpe?g|png|gif|webp|avif)$/i.exec(filename.trim());
  if (!m) return null;
  const e = m[1].toLowerCase();
  if (e === "jpeg" || e === "jpg") return ".jpg";
  return `.${e}`;
}

/** Read magic bytes (works even when browser sends wrong or empty Content-Type). */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  const riff = buf.subarray(0, 4).toString("ascii");
  const mid = buf.subarray(8, 12).toString("ascii");
  if (riff === "RIFF" && mid === "WEBP") return "image/webp";
  // ISO BMFF (AVIF / HEIC): ... size ... 'ftyp' brand
  if (buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii").replace(/\0/g, "");
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand === "heic" || brand === "heix" || brand === "mif1" || brand === "msf1") return "image/heic";
  }
  return null;
}

export function resolveImageMimeAndExt(
  declaredType: string,
  filename: string,
  buf: Buffer,
): { mime: string; ext: string } | { error: string } {
  const declared = declaredType.split(";")[0]?.trim().toLowerCase() ?? "";

  if (declared === "image/heic" || declared === "image/heif") {
    return {
      error:
        "HEIC/HEIF is not supported here. In Photos: File → Export → Export 1 Photo… → Photo Kind: JPEG (or PNG), then upload again.",
    };
  }

  let mime: string | null = null;
  if (declared.startsWith("image/") && extForMime(declared)) {
    mime = declared;
  }

  if (!mime) {
    mime = sniffImageMime(buf);
  }

  if (mime === "image/heic") {
    return {
      error:
        "This file is HEIC. Export it as JPEG or PNG from Photos (or Preview), then upload again.",
    };
  }

  if (!mime) {
    const fromName = extFromFilename(filename);
    if (fromName === ".jpg" || fromName === ".jpeg") mime = "image/jpeg";
    else if (fromName === ".png") mime = "image/png";
    else if (fromName === ".gif") mime = "image/gif";
    else if (fromName === ".webp") mime = "image/webp";
    else if (fromName === ".avif") mime = "image/avif";
  }

  if (!mime) {
    return { error: "Could not detect image type. Use JPEG, PNG, WebP, GIF, or AVIF." };
  }

  const ext = extForMime(mime);
  if (!ext) {
    return { error: `Unsupported image type: ${mime}` };
  }

  return { mime, ext };
}
