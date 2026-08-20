/**
 * Step 4 Sendit mapping / config checks (no network).
 * Run: node scripts/verify-sendit-integration.mjs
 */
import assert from "node:assert/strict";

function normalizeSenditStatus(rawStatus, statusReturn) {
  const key = (rawStatus ?? "").trim().toUpperCase();
  const ret = (statusReturn ?? "").trim().toUpperCase();
  if (
    (ret === "RETURN_SELLER" || ret === "RETURN_STOCK") &&
    (key === "CANCELED" || key === "REJECTED" || ret === "RETURN_SELLER")
  ) {
    return "RETURNED";
  }
  switch (key) {
    case "PENDING":
    case "TO_PREPARE":
      return "CREATED";
    case "TRANSIT":
    case "DELIVERING":
    case "PICKEDUP":
      return "IN_TRANSIT";
    case "UNREACHABLE":
    case "POSTPONED":
      return "FAILED_DELIVERY";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELED":
      return "CANCELLED";
    case "REJECTED":
      return "RETURNED";
    default:
      return "UNKNOWN";
  }
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
  throw new Error(`Unsupported SHIPPING_PROVIDER="${raw}"`);
}

function getStoredShippingTrackingId(order) {
  return order.shippingTrackingId?.trim() || order.olivraisonTrackingId?.trim() || null;
}

assert.equal(normalizeSenditStatus("DELIVERED"), "DELIVERED");
assert.equal(normalizeSenditStatus("UNREACHABLE"), "FAILED_DELIVERY");
assert.equal(suggestedOrderStatusFromShipping("FAILED_DELIVERY"), null);
assert.equal(suggestedOrderStatusFromShipping("DELIVERED"), "DELIVERED");
assert.equal(getConfiguredShippingProviderId(undefined), "sendit");
assert.equal(getConfiguredShippingProviderId("olivraison"), "olivraison");
assert.throws(() => getConfiguredShippingProviderId("acme"));
assert.equal(
  getStoredShippingTrackingId({ shippingTrackingId: null, olivraisonTrackingId: "LEGACY1" }),
  "LEGACY1",
);
assert.equal(
  getStoredShippingTrackingId({ shippingTrackingId: "D123", olivraisonTrackingId: "LEGACY1" }),
  "D123",
);

console.log("verify-sendit-integration: mapping + dual-read checks passed");
