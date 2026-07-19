import { isAbsolute, join, resolve } from "node:path";

const bundledUploadDirectory = join(process.cwd(), "public", "uploads", "p");

function configuredUploadDirectory(): string | null {
  const configured = process.env.UPLOAD_STORAGE_DIR?.trim();
  if (!configured) return null;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

export function getUploadWriteDirectory(): string {
  const configured = configuredUploadDirectory();
  if (configured) return configured;

  // Production releases are replaced during deployment. Keeping user uploads
  // under the account home directory makes them independent of each release.
  if (process.env.NODE_ENV === "production" && process.env.HOME) {
    return join(process.env.HOME, ".malikat-abayat", "uploads", "p");
  }

  return bundledUploadDirectory;
}

export function getUploadReadDirectories(): string[] {
  return [...new Set([getUploadWriteDirectory(), bundledUploadDirectory])];
}
