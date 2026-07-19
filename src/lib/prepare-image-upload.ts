import { heicTo } from "heic-to/next";

const HEIC_NAME = /\.(heic|heif)$/i;

export function isHeicUpload(file: File): boolean {
  const type = file.type.toLowerCase();
  return type === "image/heic" || type === "image/heif" || HEIC_NAME.test(file.name);
}

export function isSupportedImageUpload(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type === "application/octet-stream" || !file.type) {
    return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(file.name);
  }
  return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(file.name);
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isHeicUpload(file)) return file;

  const jpeg = await heicTo({
    blob: file,
    type: "image/jpeg",
    quality: 0.88,
  });
  const baseName = file.name.replace(HEIC_NAME, "") || "image";

  return new File([jpeg], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}
