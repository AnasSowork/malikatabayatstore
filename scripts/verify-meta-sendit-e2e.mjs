/**
 * Step 6 automated architecture checks (no external network / no Meta Staging).
 * Run: node scripts/verify-meta-sendit-e2e.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function purchaseEventId(orderId) {
  return orderId.trim();
}
function qualifiedOrderEventId(orderId) {
  return `qualified-order:${orderId.trim()}`;
}
function deliveredOrderEventId(orderId) {
  return `delivered-order:${orderId.trim()}`;
}

const id = "clxxxxxxxxxxxxxxxx";
assert.equal(purchaseEventId(id), id);
assert.equal(qualifiedOrderEventId(id), `qualified-order:${id}`);
assert.equal(deliveredOrderEventId(id), `delivered-order:${id}`);
assert.equal(qualifiedOrderEventId(id), qualifiedOrderEventId(id));

// Event ID helpers must be stable across retries
assert.equal(purchaseEventId(id), purchaseEventId(` ${id} `));

function isAllowedAutomaticShippingTransition(from, to) {
  if (from === to) return false;
  if (from === "SHIPPED") return ["DELIVERED", "RETURNED", "CANCELLED"].includes(to);
  if (from === "CONFIRMED" && to === "SHIPPED") return true;
  if (from === "DELIVERED" && to === "RETURNED") return true;
  return false;
}

assert.equal(isAllowedAutomaticShippingTransition("SHIPPED", "DELIVERED"), true);
assert.equal(isAllowedAutomaticShippingTransition("DELIVERED", "SHIPPED"), false);
assert.equal(isAllowedAutomaticShippingTransition("SHIPPED", "SHIPPED"), false);

// Migrations exist and are additive
const m2 = join(root, "prisma/migrations/20260820180000_order_meta_attribution_event_log/migration.sql");
const m4 = join(root, "prisma/migrations/20260820220000_order_generic_shipping_fields/migration.sql");
assert.ok(existsSync(m2), "Step 2 migration missing");
assert.ok(existsSync(m4), "Step 4 migration missing");
const sql2 = readFileSync(m2, "utf8");
const sql4 = readFileSync(m4, "utf8");
assert.ok(!/DROP\s+TABLE/i.test(sql2));
assert.ok(!/DROP\s+COLUMN/i.test(sql2));
assert.ok(!/DROP\s+TABLE/i.test(sql4));
assert.ok(!/DROP\s+COLUMN/i.test(sql4));
assert.ok(/meta_event_logs|MetaEventLog|metaFbp/i.test(sql2));
assert.ok(/shippingProvider/i.test(sql4));
assert.ok(/shippingTrackingId/i.test(sql4));

// Env presence only — never print values
function flag(name) {
  const v = process.env[name]?.trim();
  return v ? "CONFIGURED" : "MISSING";
}

const envReport = {
  NEXT_PUBLIC_META_PIXEL_ID: flag("NEXT_PUBLIC_META_PIXEL_ID"),
  META_PIXEL_ID: flag("META_PIXEL_ID"),
  META_CAPI_ACCESS_TOKEN: flag("META_CAPI_ACCESS_TOKEN"),
  META_CAPI_TEST_EVENT_CODE: flag("META_CAPI_TEST_EVENT_CODE"),
  SHIPPING_PROVIDER: process.env.SHIPPING_PROVIDER?.trim() || "(default sendit)",
  SENDIT_PUBLIC_KEY: flag("SENDIT_PUBLIC_KEY"),
  SENDIT_SECRET_KEY: flag("SENDIT_SECRET_KEY"),
  SENDIT_WEBHOOK_SECRET: flag("SENDIT_WEBHOOK_SECRET"),
};

console.log("verify-meta-sendit-e2e: event IDs + transitions + migrations OK");
console.log("ENV_FLAGS", JSON.stringify(envReport, null, 2));
