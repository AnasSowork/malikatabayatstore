import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Hostinger injects env at deploy time. A key added to the config file later
 * is not passed to a restarted process, and the standalone server's directory
 * at startup is not the app root. Read the stable config file directly.
 */
function readHostingerEnvFile(): string | null {
  const candidates = [
    path.join(os.homedir(), "domains/niramode.com/hbuilds/config/.env"),
    "/home/u299601727/domains/niramode.com/hbuilds/config/.env",
    path.resolve(process.cwd(), "../../config/.env"),
  ];
  for (const envPath of candidates) {
    try {
      if (fs.existsSync(envPath)) return fs.readFileSync(envPath, "utf8");
    } catch {
      continue;
    }
  }
  return null;
}

export function loadMissingHostingerEnv() {
  const text = readHostingerEnvFile();
  if (!text) return;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    // Passenger can inject a newly added key as blank. The test code must come
    // from the config file, which is the value the user set.
    if (key !== "META_CAPI_TEST_EVENT_CODE" && (process.env[key] ?? "").trim()) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
