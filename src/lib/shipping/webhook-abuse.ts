/**
 * Webhook abuse protection + identifier validation.
 * Anti-abuse only — status authority remains authenticated Sendit API.
 */

const IP_WINDOW_MS = 60_000;
const IP_MAX = 60; // allow Sendit retry bursts
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX = 300;
export const WEBHOOK_MAX_BODY_BYTES = 16_384;
export const WEBHOOK_MAX_CODE_LEN = 64;
export const WEBHOOK_MAX_REFERENCE_LEN = 128;

type Bucket = { count: number; resetAt: number };

type RateGlobal = typeof globalThis & {
  senditWebhookIpBuckets?: Map<string, Bucket>;
  senditWebhookGlobalBucket?: Bucket;
};

function getIpBuckets() {
  const g = globalThis as RateGlobal;
  if (!g.senditWebhookIpBuckets) g.senditWebhookIpBuckets = new Map();
  return g.senditWebhookIpBuckets;
}

function allowBucket(bucket: Bucket | undefined, max: number, windowMs: number): { ok: boolean; next: Bucket } {
  const now = Date.now();
  if (!bucket || bucket.resetAt <= now) {
    return { ok: true, next: { count: 1, resetAt: now + windowMs } };
  }
  if (bucket.count >= max) return { ok: false, next: bucket };
  return { ok: true, next: { ...bucket, count: bucket.count + 1 } };
}

export function clientIpFromWebhookRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return request.headers.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}

/** Returns true if request is allowed. */
export function allowSenditWebhookRequest(ip: string): boolean {
  const ipBuckets = getIpBuckets();
  const ipResult = allowBucket(ipBuckets.get(ip), IP_MAX, IP_WINDOW_MS);
  if (!ipResult.ok) return false;
  ipBuckets.set(ip, ipResult.next);

  const g = globalThis as RateGlobal;
  const globalResult = allowBucket(g.senditWebhookGlobalBucket, GLOBAL_MAX, GLOBAL_WINDOW_MS);
  if (!globalResult.ok) return false;
  g.senditWebhookGlobalBucket = globalResult.next;
  return true;
}

const CODE_RE = /^[A-Za-z0-9._\-]+$/;
const REF_RE = /^[A-Za-z0-9._\-]+$/;

export function sanitizeShipmentCode(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, WEBHOOK_MAX_CODE_LEN);
  if (!trimmed || !CODE_RE.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeMerchantReference(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, WEBHOOK_MAX_REFERENCE_LEN);
  if (!trimmed || !REF_RE.test(trimmed)) return null;
  return trimmed;
}

export function isPendingShipmentClaim(trackingId: string | null | undefined, orderId: string): boolean {
  return trackingId === `pending:${orderId}`;
}

export function pendingShipmentClaimId(orderId: string): string {
  return `pending:${orderId}`;
}
