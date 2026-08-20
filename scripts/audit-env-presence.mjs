#!/usr/bin/env node
/**
 * Reports CONFIGURED / MISSING for staging keys. Never prints values.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), process.argv[2] || ".env");
if (!existsSync(envPath)) {
  console.error("ENV_FILE: MISSING", envPath);
  process.exit(1);
}

const raw = readFileSync(envPath, "utf8");
const map = new Map();
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  map.set(key, value);
}

const required = [
  "NEXT_PUBLIC_META_PIXEL_ID",
  "META_CAPI_ACCESS_TOKEN",
  "META_CAPI_TEST_EVENT_CODE",
  "SHIPPING_PROVIDER",
  "SENDIT_PUBLIC_KEY",
  "SENDIT_SECRET_KEY",
  "SENDIT_WEBHOOK_SECRET",
];

const optionalContext = [
  "META_PIXEL_ID",
  "SENDIT_API_BASE_URL",
  "DATABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
];

function status(key) {
  const v = map.get(key);
  if (v === undefined || v === "") return "MISSING";
  return "CONFIGURED";
}

console.log("ENV_FILE:", envPath);
console.log("--- staging required ---");
for (const key of required) {
  if (key === "SHIPPING_PROVIDER") {
    const v = map.get(key);
    if (!v) console.log(`${key}: MISSING`);
    else console.log(`${key}: CONFIGURED`);
    continue;
  }
  console.log(`${key}: ${status(key)}`);
}
console.log("--- context (no secrets) ---");
for (const key of optionalContext) {
  if (key === "DATABASE_URL") {
    const v = map.get(key);
    if (!v) {
      console.log("DATABASE_URL: MISSING");
      continue;
    }
    try {
      const u = new URL(v);
      console.log(`DATABASE_URL: CONFIGURED host=${u.hostname} port=${u.port || "(default)"}`);
    } catch {
      console.log("DATABASE_URL: CONFIGURED");
    }
    continue;
  }
  if (key === "SENDIT_API_BASE_URL" || key === "NEXT_PUBLIC_SITE_URL") {
    const v = map.get(key);
    console.log(`${key}: ${v ? "CONFIGURED" : "MISSING"}`);
    continue;
  }
  console.log(`${key}: ${status(key)}`);
}

const provider = map.get("SHIPPING_PROVIDER") || "(default sendit)";
console.log("SHIPPING_PROVIDER_VALUE_SAFE:", provider === "sendit" || !map.get("SHIPPING_PROVIDER") ? "sendit-or-default" : "other");
