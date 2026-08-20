#!/usr/bin/env node
/**
 * Step 7 — Staging go-live checklist (host-side).
 *
 * Never prints secret values. Marks live Meta UI tests as MANUAL.
 *
 * Usage (on staging host with filled .env):
 *   node scripts/staging-go-live-checklist.mjs
 *   BASE_URL=https://staging.example.com node scripts/staging-go-live-checklist.mjs
 *   node scripts/staging-go-live-checklist.mjs --migrate-status
 *   node scripts/staging-go-live-checklist.mjs --city-matrix
 *   node scripts/staging-go-live-checklist.mjs --webhook-probe
 *
 * Do NOT pass --migrate-deploy unless you intend to apply migrations on THIS database.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

const flag = (name) => process.argv.includes(name);
const wantMigrateStatus = flag("--migrate-status");
const wantMigrateDeploy = flag("--migrate-deploy");
const wantCityMatrix = flag("--city-matrix");
const wantWebhookProbe = flag("--webhook-probe");

function presence(key) {
  const v = process.env[key]?.trim();
  return v ? "CONFIGURED" : "MISSING";
}

function section(title) {
  console.log(`\n## ${title}`);
}

section("1. Pre-staging configuration");
const keys = [
  "NEXT_PUBLIC_META_PIXEL_ID",
  "META_CAPI_ACCESS_TOKEN",
  "META_CAPI_TEST_EVENT_CODE",
  "SHIPPING_PROVIDER",
  "SENDIT_PUBLIC_KEY",
  "SENDIT_SECRET_KEY",
  "SENDIT_WEBHOOK_SECRET",
];
for (const key of keys) {
  if (key === "SHIPPING_PROVIDER") {
    const v = process.env.SHIPPING_PROVIDER?.trim();
    console.log(`${key}: ${v ? "CONFIGURED" : "MISSING (defaults to sendit)"}`);
    continue;
  }
  console.log(`${key}: ${presence(key)}`);
}

const baseUrl = (process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
  /\/$/,
  "",
);
console.log(`BASE_URL: ${baseUrl ? "CONFIGURED" : "MISSING"}`);

section("2. Database migration");
if (wantMigrateStatus || wantMigrateDeploy) {
  const status = spawnSync("npx", ["prisma", "migrate", "status"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  console.log(status.stdout || status.stderr || "(no output)");
  if (wantMigrateDeploy) {
    console.log("--- migrate deploy ---");
    const deploy = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
    console.log(deploy.stdout || deploy.stderr || "(no output)");
    const after = spawnSync("npx", ["prisma", "migrate", "status"], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
    console.log(after.stdout || after.stderr || "(no output)");
  }
} else {
  console.log("SKIPPED — re-run with --migrate-status (or --migrate-deploy on staging only)");
}

section("3. Health check");
if (!baseUrl) {
  console.log("SKIPPED — set BASE_URL");
} else {
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const json = await res.json();
    const shipping = json.shipping || {};
    console.log(`http: ${res.status}`);
    console.log(`ok: ${json.ok === true ? "PASS" : "FAIL"}`);
    console.log(`metaCapi: ${json.metaCapi === true || json.meta?.capiConfigured === true ? "true" : "false"}`);
    console.log(`senditConfigured: ${shipping.senditConfigured === true ? "true" : "false"}`);
    console.log(`activeProvider: ${shipping.provider ?? "(null)"}`);
    console.log(`activeConfigured: ${shipping.activeConfigured === true ? "true" : "false"}`);
    const blob = JSON.stringify(json);
    if (/access_token|secret_key|password|SENDIT_|META_CAPI/i.test(blob)) {
      console.log("credentialLeak: FAIL (secrets appear in health payload)");
    } else {
      console.log("credentialLeak: PASS");
    }
  } catch (error) {
    console.log(`FAIL — ${error instanceof Error ? error.message : error}`);
  }
}

section("4–13 / 15–23. Meta + order funnel (manual)");
console.log("MANUAL — Meta Events Manager Test Events + admin/order UI");
console.log("Record PASS/FAIL in docs/staging-go-live.md matrix after running.");

section("14. Sendit city matrix");
if (!wantCityMatrix) {
  console.log("SKIPPED — re-run with --city-matrix when SENDIT_* keys are set");
} else if (presence("SENDIT_PUBLIC_KEY") === "MISSING" || presence("SENDIT_SECRET_KEY") === "MISSING") {
  console.log("FAIL — SENDIT keys MISSING");
} else {
  const base = (process.env.SENDIT_API_BASE_URL || "https://app.sendit.ma/api/v1").replace(
    /\/$/,
    "",
  );
  const inputs = [
    "Casablanca",
    "casa",
    "Rabat",
    "Marrakech",
    "Marrakesh",
    "Tangier",
    "Tanger",
    "Agadir",
    "Fès",
    "Fes",
    "Meknès",
    "Meknes",
  ];

  function normalizeCityKey(value) {
    return value
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  try {
    const loginRes = await fetch(`${base}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        public_key: process.env.SENDIT_PUBLIC_KEY,
        secret_key: process.env.SENDIT_SECRET_KEY,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    const token =
      loginJson?.data?.token ||
      loginJson?.token ||
      loginJson?.access_token ||
      null;
    if (!token) {
      console.log(`FAIL — Sendit login HTTP ${loginRes.status}`);
    } else {
      console.log("Sendit login: PASS");
      const distRes = await fetch(`${base}/districts`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      const distJson = await distRes.json().catch(() => ({}));
      const rows = Array.isArray(distJson?.data) ? distJson.data : [];
      console.log(`districts fetched: ${rows.length}`);

      for (const input of inputs) {
        const exact = rows.filter(
          (d) =>
            String(d.ville || "").trim() === input ||
            String(d.name || "").trim() === input ||
            String(d.arabic_name || "").trim() === input,
        );
        if (exact.length === 1) {
          console.log(`${input}\t${exact[0].ville || exact[0].name}\tEXACT`);
          continue;
        }
        if (exact.length > 1) {
          console.log(`${input}\t(multiple)\tAMBIGUOUS`);
          continue;
        }
        const want = normalizeCityKey(input);
        const matches = rows.filter((d) => {
          const keys = [d.ville, d.name, d.arabic_name]
            .filter(Boolean)
            .map((x) => normalizeCityKey(String(x)));
          return keys.includes(want);
        });
        if (matches.length === 1) {
          console.log(
            `${input}\t${matches[0].ville || matches[0].name}\tSAFE_NORMALIZED`,
          );
        } else if (matches.length > 1) {
          console.log(`${input}\t(multiple)\tAMBIGUOUS`);
        } else {
          console.log(`${input}\t-\tNOT_FOUND`);
        }
      }
    }
  } catch (error) {
    console.log(`FAIL — ${error instanceof Error ? error.message : error}`);
  }
}

section("21. Webhook trigger security");
if (!wantWebhookProbe) {
  console.log("SKIPPED — re-run with --webhook-probe and BASE_URL");
} else if (!baseUrl) {
  console.log("FAIL — BASE_URL required");
} else {
  try {
    const bad = await fetch(`${baseUrl}/api/webhooks/sendit?secret=definitely-wrong`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "TESTCODE123" }),
      signal: AbortSignal.timeout(15000),
    });
    console.log(`invalid secret HTTP: ${bad.status} (expect 401 if secret configured)`);
    console.log("API-authoritative status: code path requires Sendit re-fetch (code-verified)");
    console.log("Official HMAC: NOT AVAILABLE (Sendit PDF not public)");
  } catch (error) {
    console.log(`FAIL — ${error instanceof Error ? error.message : error}`);
  }
}

section("Final matrix (fill after manual tests)");
const rows = [
  "PageView",
  "ViewContent",
  "AddToCart semantics",
  "InitiateCheckout",
  "Purchase browser",
  "Purchase server",
  "Purchase dedupe",
  "Refresh protection",
  "QualifiedOrder",
  "Qualified dedupe",
  "Sendit shipment",
  "Shipment duplicate protection",
  "City mapping",
  "Status sync",
  "DeliveredOrder",
  "Delivered dedupe",
  "Consent reject",
  "Meta failure isolation",
  "Sendit failure isolation",
  "Webhook trigger security",
];
for (const r of rows) {
  console.log(`| ${r} | NOT_RUN | |`);
}

console.log("\nDecision gate: any critical FAIL → NO-GO");
