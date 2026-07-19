import { existsSync } from "node:fs";
import { isAbsolute, join, resolve, sep } from "node:path";

const bundledUploadDirectory = join(process.cwd(), "public", "uploads", "p");

function configuredUploadDirectory(): string | null {
  const configured = process.env.UPLOAD_STORAGE_DIR?.trim();
  if (!configured) return null;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

/** Hostinger Passenger often sets HOME to the domain folder, not /home/<user>. */
function resolveAccountHome(): string | null {
  const cwd = process.cwd();
  const domainsSegment = `${sep}domains${sep}`;
  const domainsIndex = cwd.indexOf(domainsSegment);
  if (domainsIndex > 0) {
    return cwd.slice(0, domainsIndex);
  }

  const home = process.env.HOME?.trim();
  if (home) {
    const homeDomainsIndex = home.indexOf(domainsSegment);
    if (homeDomainsIndex > 0) {
      return home.slice(0, homeDomainsIndex);
    }
    // Prefer a real /home/<user> path over a domain-scoped HOME.
    if (/^\/home\/[^/]+$/.test(home)) {
      return home;
    }
  }

  return home || null;
}

function persistentUploadDirectory(): string | null {
  const accountHome = resolveAccountHome();
  if (!accountHome) return null;
  return join(accountHome, ".malikat-abayat", "uploads", "p");
}

export function getUploadWriteDirectory(): string {
  return configuredUploadDirectory() || persistentUploadDirectory() || bundledUploadDirectory;
}

export function getUploadReadDirectories(): string[] {
  const candidates = [
    configuredUploadDirectory(),
    persistentUploadDirectory(),
    // Legacy Hostinger HOME-scoped path used by earlier builds.
    process.env.HOME
      ? join(process.env.HOME, ".malikat-abayat", "uploads", "p")
      : null,
    bundledUploadDirectory,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates.filter((dir) => existsSync(dir) || dir === getUploadWriteDirectory()))];
}
