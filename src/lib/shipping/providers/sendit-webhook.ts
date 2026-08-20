/**
 * Sendit inbound webhook parsing + optional shared-secret gate.
 *
 * Official OpenAPI references an external webhook PDF that is not publicly available.
 * Policy:
 * - Optional high-entropy SENDIT_WEBHOOK_SECRET is anti-abuse for the trigger URL
 *   (NOT cryptographic payload authentication if placed in query string).
 * - Status authority = authenticated Sendit API re-fetch only.
 */

import {
  sanitizeMerchantReference,
  sanitizeShipmentCode,
} from "@/lib/shipping/webhook-abuse";

export type SenditWebhookHints = {
  shipmentCode: string | null;
  merchantReference: string | null;
  /** Present in payload but NEVER used as authority for local mutations */
  claimedRawStatus: string | null;
};

export class SenditWebhookAuthError extends Error {
  readonly code = "SENDIT_WEBHOOK_AUTH_FAILED";

  constructor(message = "Webhook authentication failed.") {
    super(message);
    this.name = "SenditWebhookAuthError";
  }
}

export class SenditWebhookParseError extends Error {
  readonly code = "SENDIT_WEBHOOK_PARSE_FAILED";

  constructor(message = "Webhook payload could not be parsed.") {
    super(message);
    this.name = "SenditWebhookParseError";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

/**
 * Best-effort identifier extraction. Status fields are ignored for mutations.
 */
export function extractSenditWebhookHints(payload: unknown): SenditWebhookHints {
  const root = asRecord(payload);
  if (!root) {
    throw new SenditWebhookParseError("Webhook body must be a JSON object.");
  }

  const data = asRecord(root.data) ?? asRecord(root.colis) ?? asRecord(root.delivery) ?? null;
  const nested = data ?? {};

  const rawCode =
    readString(root, ["code", "trackingID", "tracking_id", "trackingCode", "delivery_code"]) ||
    readString(nested, ["code", "trackingID", "tracking_id", "trackingCode"]);

  const rawRef =
    readString(root, ["reference", "orderId", "order_id", "merchant_reference"]) ||
    readString(nested, ["reference", "orderId", "order_id", "merchant_reference"]);

  const claimedRawStatus =
    readString(root, ["status", "statut", "parcel_status"]) ||
    readString(nested, ["status", "statut", "parcel_status"]);

  const shipmentCode = sanitizeShipmentCode(rawCode);
  const merchantReference = sanitizeMerchantReference(rawRef);

  if (!shipmentCode && !merchantReference) {
    throw new SenditWebhookParseError(
      "Webhook payload missing valid shipment code and merchant reference.",
    );
  }

  return {
    shipmentCode,
    merchantReference,
    claimedRawStatus,
  };
}

/**
 * Optional shared-secret gate (anti-abuse).
 * Query-string secrets are NOT cryptographic webhook authentication —
 * they only raise the bar for random internet traffic.
 */
export function verifySenditWebhookRequest(input: {
  headers: Headers;
  url: string;
}): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.SENDIT_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return { ok: true };
  }

  if (expected.length < 24) {
    console.warn("[sendit-webhook] SENDIT_WEBHOOK_SECRET should be high-entropy (≥24 chars)");
  }

  const headerSecret =
    input.headers.get("x-sendit-webhook-secret")?.trim() ||
    input.headers.get("x-webhook-secret")?.trim() ||
    null;

  const auth = input.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;

  let querySecret: string | null = null;
  try {
    querySecret = new URL(input.url).searchParams.get("secret")?.trim() || null;
  } catch {
    querySecret = null;
  }

  const provided = headerSecret || bearer || querySecret;
  if (!provided || provided !== expected) {
    return { ok: false, reason: "missing_or_invalid_webhook_secret" };
  }

  return { ok: true };
}

export function senditWebhookHmacStatus(): "not_configured" | "ready" {
  return "not_configured";
}
