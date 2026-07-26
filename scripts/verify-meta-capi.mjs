#!/usr/bin/env node
/**
 * Verify Meta Pixel + CAPI configuration and optionally send a test event.
 *
 * Usage:
 *   node scripts/verify-meta-capi.mjs
 *   node scripts/verify-meta-capi.mjs --send-test
 *   BASE_URL=https://malikatalabayat.com node scripts/verify-meta-capi.mjs
 */
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const sendTest = process.argv.includes("--send-test");
const baseUrl = (process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

const pixelId =
  process.env.META_PIXEL_ID ||
  process.env.NEXT_PUBLIC_META_PIXEL_ID ||
  "1348553670819805";
const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
const testCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();

function ok(label) {
  console.log(`  ✓ ${label}`);
}

function warn(label) {
  console.warn(`  ⚠ ${label}`);
}

function fail(label) {
  console.error(`  ✗ ${label}`);
}

console.log("\nMeta Pixel + CAPI verification\n");

if (pixelId) ok(`Pixel ID: ${pixelId}`);
else fail("Missing NEXT_PUBLIC_META_PIXEL_ID / META_PIXEL_ID");

if (accessToken) ok(`CAPI access token: set (${accessToken.length} chars)`);
else fail("Missing META_CAPI_ACCESS_TOKEN");

if (testCode) warn(`META_CAPI_TEST_EVENT_CODE is set (${testCode}) — remove for live ads`);
else ok("No test event code (live mode)");

if (baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const json = await res.json();
    if (json.metaCapi) ok(`Production health: metaCapi=true (${baseUrl})`);
    else warn(`Production health: metaCapi=false (${baseUrl})`);
  } catch (error) {
    warn(`Could not reach ${baseUrl}/api/health — ${error instanceof Error ? error.message : error}`);
  }
} else {
  warn("Set BASE_URL to check production /api/health");
}

if (sendTest) {
  if (!accessToken) {
    console.error("\nCannot send test event without META_CAPI_ACCESS_TOKEN.\n");
    process.exit(1);
  }

  const eventId = `verify-${randomUUID()}`;
  const body = {
    data: [
      {
        event_name: "ViewContent",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: baseUrl || "https://malikatalabayat.com",
        user_data: {
          client_ip_address: "127.0.0.1",
          client_user_agent: "verify-meta-capi-script",
        },
        custom_data: {
          value: 1,
          currency: "MAD",
          content_ids: ["verify-product"],
          content_type: "product",
          contents: [{ id: "verify-product", quantity: 1, item_price: 1 }],
          num_items: 1,
        },
      },
    ],
  };

  if (testCode) body.test_event_code = testCode;

  console.log(`\nSending test ViewContent (event_id=${eventId})…`);

  const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    fail(`Graph API error: ${json.error?.message ?? res.status}`);
    process.exit(1);
  }

  ok(`Events received: ${json.events_received ?? 0}`);
  if (testCode) {
    ok(`Check Meta Events Manager → Test events for code ${testCode}`);
  } else {
    warn("No test code — event went to live stream (use META_CAPI_TEST_EVENT_CODE for Test events tab)");
  }
} else {
  console.log("\nTip: run with --send-test to POST a ViewContent event to Graph API.\n");
}
