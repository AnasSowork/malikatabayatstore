#!/usr/bin/env npx tsx
/**
 * Backfill failed / missing Meta Purchase CAPI events.
 *
 * Set PRODUCTION_DATABASE_URL in .env to run against Hostinger (see .env.example).
 * For live send, also set META_CAPI_ACCESS_TOKEN and META_PIXEL_ID.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadMetaPurchaseDiagnostics,
  backfillPurchaseBatch,
  disconnectBackfillPrisma,
} from "../src/lib/meta-backfill";
import { isMetaCapiConfigured } from "../src/lib/meta-capi-server";

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
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const orderIdArg = args.find((a) => a.startsWith("--order-id="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 50;
const orderId = orderIdArg ? orderIdArg.split("=")[1]?.trim() : undefined;

async function main() {
  const usingProduction = Boolean(process.env.PRODUCTION_DATABASE_URL?.trim());
  if (usingProduction) {
    console.log("Using PRODUCTION_DATABASE_URL");
  } else {
    console.log("Using local DATABASE_URL (set PRODUCTION_DATABASE_URL for Hostinger data)");
  }

  const diagnostics = await loadMetaPurchaseDiagnostics(500);
  console.log("\nMeta Purchase diagnostics");
  console.log(JSON.stringify(diagnostics.totals, null, 2));
  console.log(
    `Attribution: fbp=${diagnostics.attribution.withFbp} fbc=${diagnostics.attribution.withFbc} utm=${diagnostics.attribution.withUtm}`,
  );

  if (dryRun) {
    const targets = orderId
      ? diagnostics.candidates.filter((row) => row.orderId === orderId)
      : diagnostics.candidates.slice(0, limit);
    console.log(`\nDry run — would process ${targets.length} order(s):`);
    for (const row of targets) {
      console.log(
        `  ${row.orderId}  ${row.reason}  ${row.customerName}  fbp=${row.metaFbp} fbc=${row.metaFbc}`,
      );
    }
    return;
  }

  if (!isMetaCapiConfigured()) {
    throw new Error(
      "Meta CAPI not configured locally. Add META_CAPI_ACCESS_TOKEN and META_PIXEL_ID to .env for live send.",
    );
  }

  const batch = await backfillPurchaseBatch({
    orderIds: orderId ? [orderId] : undefined,
    limit: Number.isFinite(limit) ? limit : 50,
    delayMs: 200,
  });

  console.log("\nBackfill results");
  console.log(JSON.stringify(batch, null, 2));

  const after = await loadMetaPurchaseDiagnostics(20);
  console.log("\nAfter totals");
  console.log(JSON.stringify(after.totals, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => disconnectBackfillPrisma());
