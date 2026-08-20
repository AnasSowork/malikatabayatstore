/**
 * Step 3 lifecycle matrix checks (no network / no DB).
 * Run: node scripts/verify-order-lifecycle.mjs
 */
import assert from "node:assert/strict";

function eventForTransition(from, to) {
  if (from === to) return null;
  if (to === "CONFIRMED") return "QualifiedOrder";
  if (to === "DELIVERED") return "DeliveredOrder";
  if (to === "CANCELLED") return "CancelledOrder_internal";
  if (to === "RETURNED") return "ReturnedOrder_internal";
  if (to === "SHIPPED") return null;
  return null;
}

const cases = [
  ["PENDING", "PENDING", null, "C no-op"],
  ["PENDING", "CONFIRMED", "QualifiedOrder", "B confirm"],
  ["CONFIRMED", "CONFIRMED", null, "C confirm twice"],
  ["CONFIRMED", "SHIPPED", null, "D ship"],
  ["SHIPPED", "DELIVERED", "DeliveredOrder", "E deliver"],
  ["DELIVERED", "DELIVERED", null, "F deliver twice"],
  ["PENDING", "CANCELLED", "CancelledOrder_internal", "J cancel"],
  ["CONFIRMED", "CANCELLED", "CancelledOrder_internal", "J cancel"],
  ["SHIPPED", "RETURNED", "ReturnedOrder_internal", "K return"],
  ["DELIVERED", "RETURNED", "ReturnedOrder_internal", "K return"],
];

for (const [from, to, expected, label] of cases) {
  assert.equal(eventForTransition(from, to), expected, label);
}

function qualifiedOrderEventId(orderId) {
  return `qualified-order:${orderId.trim()}`;
}
function deliveredOrderEventId(orderId) {
  return `delivered-order:${orderId.trim()}`;
}

assert.equal(qualifiedOrderEventId("abc"), "qualified-order:abc");
assert.equal(deliveredOrderEventId("abc"), "delivered-order:abc");
assert.equal(qualifiedOrderEventId("abc"), qualifiedOrderEventId("abc"));

console.log("verify-order-lifecycle: all transition matrix assertions passed");
