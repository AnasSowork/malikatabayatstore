import { NextResponse } from "next/server";
import {
  extractSenditWebhookHints,
  SenditWebhookAuthError,
  SenditWebhookParseError,
  verifySenditWebhookRequest,
} from "@/lib/shipping/providers/sendit-webhook";
import { syncSenditOrderFromWebhookHints } from "@/lib/shipping/sync";
import { SenditApiError } from "@/lib/shipping/providers/sendit-client";
import { ShippingNotConfiguredError } from "@/lib/shipping/provider";
import {
  allowSenditWebhookRequest,
  clientIpFromWebhookRequest,
  WEBHOOK_MAX_BODY_BYTES,
} from "@/lib/shipping/webhook-abuse";

export const runtime = "nodejs";

/**
 * Sendit status webhook trigger.
 * Body status is non-authoritative; Sendit API re-fetch is the trust boundary.
 */
export async function POST(request: Request) {
  try {
    const ip = clientIpFromWebhookRequest(request);
    if (!allowSenditWebhookRequest(ip)) {
      return NextResponse.json({ ok: false, code: "RATE_LIMITED" }, { status: 429 });
    }

    const auth = verifySenditWebhookRequest({
      headers: request.headers,
      url: request.url,
    });
    if (!auth.ok) {
      console.warn("[webhooks/sendit] rejected", auth.reason);
      return NextResponse.json(
        { ok: false, code: "SENDIT_WEBHOOK_AUTH_FAILED" },
        { status: 401 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType && !contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { ok: false, code: "SENDIT_WEBHOOK_UNSUPPORTED_CONTENT_TYPE" },
        { status: 415 },
      );
    }

    const rawText = await request.text();
    if (rawText.length > WEBHOOK_MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, code: "SENDIT_WEBHOOK_BODY_TOO_LARGE" },
        { status: 413 },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      return NextResponse.json(
        { ok: false, code: "SENDIT_WEBHOOK_INVALID_JSON" },
        { status: 400 },
      );
    }

    const hints = extractSenditWebhookHints(payload);

    const result = await syncSenditOrderFromWebhookHints({
      shipmentCode: hints.shipmentCode,
      merchantReference: hints.merchantReference,
    });

    // Never log full URL (may contain ?secret=) or raw PII payloads.
    console.info("[webhooks/sendit]", {
      orderId: result.orderId,
      hasCode: Boolean(hints.shipmentCode),
      hasReference: Boolean(hints.merchantReference),
      claimedStatus: hints.claimedRawStatus,
      apiStatus: result.shipping?.rawStatus ?? null,
      normalized: result.shipping?.normalizedStatus ?? null,
      applied: result.applied,
      from: result.fromStatus,
      to: result.toStatus,
      reason: result.reason ?? null,
    });

    return NextResponse.json({
      ok: true,
      applied: result.applied,
      reason: result.reason ?? null,
    });
  } catch (error) {
    if (error instanceof SenditWebhookAuthError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 401 });
    }
    if (error instanceof SenditWebhookParseError) {
      console.warn("[webhooks/sendit] parse", error.code);
      return NextResponse.json({ ok: false, code: error.code }, { status: 400 });
    }
    if (error instanceof ShippingNotConfiguredError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 503 });
    }
    if (error instanceof SenditApiError) {
      console.error("[webhooks/sendit] sendit api", error.code, error.httpStatus);
      return NextResponse.json(
        { ok: false, code: error.code },
        { status: error.httpStatus === 504 || error.httpStatus >= 500 ? 503 : 502 },
      );
    }
    console.error(
      "[webhooks/sendit]",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ ok: false, code: "WEBHOOK_INTERNAL_ERROR" }, { status: 500 });
  }
}
