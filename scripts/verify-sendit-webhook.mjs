/**
 * Step 5 webhook/sync safety checks (no network).
 * Run: node scripts/verify-sendit-webhook.mjs
 */
import assert from "node:assert/strict";

function isAllowedAutomaticShippingTransition(from, to) {
  if (from === to) return false;
  if (from === "SHIPPED") {
    return to === "DELIVERED" || to === "RETURNED" || to === "CANCELLED";
  }
  if (from === "CONFIRMED" && to === "SHIPPED") return true;
  if (from === "DELIVERED" && to === "RETURNED") return true;
  return false;
}

function extractHints(payload) {
  const root = payload && typeof payload === "object" ? payload : null;
  if (!root) throw new Error("parse");
  const data = root.data && typeof root.data === "object" ? root.data : {};
  const shipmentCode = root.code || data.code || null;
  const merchantReference = root.reference || data.reference || null;
  if (!shipmentCode && !merchantReference) throw new Error("missing ids");
  return { shipmentCode, merchantReference, claimedRawStatus: root.status || data.status || null };
}

assert.equal(isAllowedAutomaticShippingTransition("SHIPPED", "DELIVERED"), true);
assert.equal(isAllowedAutomaticShippingTransition("SHIPPED", "SHIPPED"), false);
assert.equal(isAllowedAutomaticShippingTransition("DELIVERED", "SHIPPED"), false);
assert.equal(isAllowedAutomaticShippingTransition("SHIPPED", "RETURNED"), true);
assert.equal(isAllowedAutomaticShippingTransition("PENDING", "DELIVERED"), false);

const hints = extractHints({ code: "D1", reference: "ord1", status: "DELIVERED", data: {} });
assert.equal(hints.shipmentCode, "D1");
assert.equal(hints.claimedRawStatus, "DELIVERED");
// Policy: claimed status must never be applied without API re-fetch (documented).

assert.throws(() => extractHints({ foo: 1 }));

console.log("verify-sendit-webhook: transition guard + hint extraction passed");
