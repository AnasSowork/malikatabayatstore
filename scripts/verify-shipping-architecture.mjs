/**
 * Shipping abstraction checks (no network).
 * Run: node scripts/verify-shipping-architecture.mjs
 */
import assert from "node:assert/strict";

function normalizeOlivraisonStatus(rawStatus) {
  const key = (rawStatus ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!key) return "UNKNOWN";
  const map = {
    NEW: "CREATED",
    PENDING: "CREATED",
    CREATED: "CREATED",
    CONFIRMED: "IN_TRANSIT",
    PICKUP: "IN_TRANSIT",
    TRANSIT: "IN_TRANSIT",
    RECIVED: "IN_TRANSIT",
    DELIVERED: "DELIVERED",
    LIVRE: "DELIVERED",
    RETURNED: "RETURNED",
    CANCELED: "CANCELLED",
    CANCELLED: "CANCELLED",
    REFUSED: "FAILED_DELIVERY",
    NO_ANSWER: "FAILED_DELIVERY",
  };
  return map[key] ?? "UNKNOWN";
}

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
  if (raw === "sendit" || raw === "olivraison") return raw;
  throw new Error(`Unsupported SHIPPING_PROVIDER="${raw}". Supported: sendit, olivraison`);
}

assert.equal(normalizeOlivraisonStatus("DELIVERED"), "DELIVERED");
assert.equal(normalizeOlivraisonStatus("TRANSIT"), "IN_TRANSIT");
assert.equal(suggestedOrderStatusFromShipping("DELIVERED"), "DELIVERED");
assert.equal(suggestedOrderStatusFromShipping("UNKNOWN"), null);
assert.equal(getConfiguredShippingProviderId(undefined), "sendit");
assert.equal(getConfiguredShippingProviderId("olivraison"), "olivraison");
assert.equal(getConfiguredShippingProviderId("sendit"), "sendit");
assert.throws(() => getConfiguredShippingProviderId("acme_express"));

console.log("verify-shipping-architecture: normalization + config checks passed");
