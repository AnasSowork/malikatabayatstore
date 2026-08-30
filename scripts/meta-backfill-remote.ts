#!/usr/bin/env npx tsx
/**
 * Run Meta backfill against a live site via admin API (no local DB required).
 *
 * Reads `.env` for BACKFILL_* / ADMIN_* / BASE_URL.
 *
 * Usage:
 *   npm run meta:backfill:remote:dry
 *   npm run meta:backfill:remote
 */
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

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || !args.includes("--send");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 50;

const baseUrl = (
  process.env.BACKFILL_BASE_URL ??
  process.env.BASE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://malikatalabayat.com"
).replace(/\/$/, "");

const adminEmail =
  process.env.BACKFILL_ADMIN_EMAIL ??
  process.env.ADMIN_EMAIL ??
  "admin@malikatalabayat.com";

const adminPassword =
  process.env.BACKFILL_ADMIN_PASSWORD ??
  process.env.ADMIN_PASSWORD ??
  process.env.PRODUCTION_ADMIN_PASSWORD;

function parseCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(/malikatabayat_admin_token=([^;]+)/);
  return match?.[1] ?? null;
}

async function adminLogin(): Promise<string> {
  if (!adminPassword) {
    throw new Error(
      "Set BACKFILL_ADMIN_PASSWORD or ADMIN_PASSWORD to the production admin password.",
    );
  }

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Login failed (${res.status})`);
  }

  const token = parseCookie(res.headers.get("set-cookie"));
  if (!token) {
    throw new Error("Login succeeded but admin cookie was not returned.");
  }
  return token;
}

async function adminFetch(path: string, token: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: `malikatabayat_admin_token=${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

async function main() {
  console.log(`\nMeta backfill (remote) → ${baseUrl}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "send"}\n`);

  const token = await adminLogin();
  console.log("✓ Admin login OK");

  const diagRes = await adminFetch("/api/admin/meta-events/diagnostics?limit=100", token);
  const diagJson = (await diagRes.json()) as {
    error?: string;
    metaCapiConfigured?: boolean;
    diagnostics?: {
      totals: Record<string, number>;
      attribution: Record<string, number>;
      candidates: Array<{
        orderId: string;
        customerName: string;
        reason: string;
        metaFbp: boolean;
        metaFbc: boolean;
        createdAt: string;
      }>;
    };
  };

  if (!diagRes.ok) {
    throw new Error(diagJson.error ?? `Diagnostics failed (${diagRes.status})`);
  }

  console.log("\nDiagnostics totals:");
  console.log(JSON.stringify(diagJson.diagnostics?.totals ?? {}, null, 2));
  console.log("\nAttribution:");
  console.log(JSON.stringify(diagJson.diagnostics?.attribution ?? {}, null, 2));
  console.log(`\nMeta CAPI configured: ${diagJson.metaCapiConfigured ? "yes" : "no"}`);

  const candidates = diagJson.diagnostics?.candidates ?? [];
  if (candidates.length > 0) {
    console.log(`\nSample candidates (up to ${candidates.length}):`);
    for (const row of candidates.slice(0, 15)) {
      console.log(
        `  ${row.orderId.slice(0, 8)}…  ${row.reason.padEnd(16)}  ${row.customerName}  fbp=${row.metaFbp} fbc=${row.metaFbc}`,
      );
    }
  }

  const backfillRes = await adminFetch("/api/admin/meta-events/backfill", token, {
    method: "POST",
    body: JSON.stringify({ dryRun, limit }),
  });

  const backfillJson = (await backfillRes.json()) as {
    error?: string;
    dryRun?: boolean;
    wouldProcess?: number;
    orderIds?: string[];
    batch?: {
      processed: number;
      sent: number;
      failed: number;
      skipped: number;
      alreadyDone: number;
      results: Array<{ orderId: string; result: string; reason: string | null }>;
    };
    diagnostics?: Record<string, number>;
  };

  if (!backfillRes.ok) {
    throw new Error(backfillJson.error ?? `Backfill failed (${backfillRes.status})`);
  }

  console.log(`\nBackfill ${dryRun ? "preview" : "result"}:`);
  console.log(JSON.stringify(backfillJson, null, 2));

  if (!dryRun && backfillJson.batch) {
    const failed = backfillJson.batch.results.filter((r) => r.result === "failed");
    if (failed.length > 0) {
      console.log("\nFailed orders:");
      for (const row of failed) {
        console.log(`  ${row.orderId}  ${row.reason ?? ""}`);
      }
    }
  }
}

main().catch((error) => {
  console.error("\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
