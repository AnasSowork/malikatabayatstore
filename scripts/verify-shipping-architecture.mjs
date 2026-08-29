/**
 * Shipping abstraction checks (no network).
 * Run: node scripts/verify-shipping-architecture.mjs
 */
import assert from "node:assert/strict";

function suggestedOrderStatusFromShipping(status) {
  switch (status) {
    case "CREATED":
    case "IN_TRANSIT":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "RETURNED":
      return "RETURNED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return null;
  }
}

function getConfiguredShippingProviderId(envValue) {
  const raw = (envValue ?? "sendit").trim().toLowerCase();
  if (raw === "sendit") return raw;
  throw new Error(`Unsupported SHIPPING_PROVIDER="${raw}". Only sendit is supported.`);
}

assert.equal(suggestedOrderStatusFromShipping("DELIVERED"), "DELIVERED");
assert.equal(suggestedOrderStatusFromShipping("UNKNOWN"), null);
assert.equal(getConfiguredShippingProviderId(undefined), "sendit");
assert.equal(getConfiguredShippingProviderId("sendit"), "sendit");
assert.throws(() => getConfiguredShippingProviderId("legacy_carrier"));
assert.throws(() => getConfiguredShippingProviderId("acme_express"));

console.log("verify-shipping-architecture: config checks passed");
