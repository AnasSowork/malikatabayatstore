#!/usr/bin/env npx tsx
/**
 * Backfill failed / missing Meta Purchase CAPI events.
 *
 * Usage:
 *   npx tsx scripts/backfill-meta-purchases.ts --dry-run
 *   npx tsx scripts/backfill-meta-purchases.ts --limit=50
 *   npx tsx scripts/backfill-meta-purchases.ts --order-id=<uuid>
 */
import { loadMetaPurchaseDiagnostics, backfillPurchaseBatch } from "../src/lib/meta-backfill";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const orderIdArg = args.find((a) => a.startsWith("--order-id="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 50;
const orderId = orderIdArg ? orderIdArg.split("=")[1]?.trim() : undefined;

async function main() {
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
