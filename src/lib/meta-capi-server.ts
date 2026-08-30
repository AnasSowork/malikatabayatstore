import {
  firstNameFromFullName,
  hashMetaCity,
  hashMetaCountry,
  hashMetaEmail,
  hashMetaExternalId,
  hashMetaName,
  hashMetaPhone,
} from "@/lib/meta-capi-hash";
import { META_PIXEL_COUNTRY } from "@/lib/meta-pixel-user";
import { buildMetaCommerceData, type MetaCommerceInput } from "@/lib/meta-commerce";
import type { MetaCapiResolvedUserData } from "@/lib/meta-param-builder-server";

/** Standard Meta ecommerce events + COD quality custom events (CAPI-only). */
export type MetaCapiEventName =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "QualifiedOrder"
  | "DeliveredOrder";

/** Browser-relayable events only — Purchase is order-API authoritative. */
export const META_BROWSER_RELAY_EVENTS = [
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
] as const satisfies ReadonlyArray<"ViewContent" | "AddToCart" | "InitiateCheckout">;

/**
 * Meta Graph CAPI accepts custom `event_name` strings for optimization/custom conversions.
 * QualifiedOrder / DeliveredOrder are server-only custom events (no Pixel).
 */
export const META_CAPI_CUSTOM_EVENTS = ["QualifiedOrder", "DeliveredOrder"] as const;

export type MetaCapiUserInput = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  fullName?: string | null;
  city?: string | null;
  externalId?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  /** Pre-hashed PII from Meta Parameter Builder — preferred when present. */
  paramBuilder?: MetaCapiResolvedUserData["hashed"] | null;
};

export type MetaCapiEventInput = {
  eventName: MetaCapiEventName;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string | null;
  referrerUrl?: string | null;
  commerce: MetaCommerceInput;
  productName?: string | null;
  user?: MetaCapiUserInput;
};

type GraphUserData = Record<string, string | string[]>;

function applyHashedField(
  data: GraphUserData,
  key: string,
  hashed: string | null | undefined,
) {
  if (hashed) data[key] = [hashed];
}

function buildUserData(user?: MetaCapiUserInput): GraphUserData {
  const data: GraphUserData = {};

  if (user?.clientIpAddress) data.client_ip_address = user.clientIpAddress;
  if (user?.clientUserAgent) data.client_user_agent = user.clientUserAgent;
  if (user?.fbp) data.fbp = user.fbp;
  if (user?.fbc) data.fbc = user.fbc;

  const pb = user?.paramBuilder;
  if (pb) {
    applyHashedField(data, "em", pb.em);
    applyHashedField(data, "ph", pb.ph);
    applyHashedField(data, "fn", pb.fn);
    applyHashedField(data, "ln", pb.ln);
    applyHashedField(data, "ct", pb.ct);
    applyHashedField(data, "country", pb.country);
    applyHashedField(data, "external_id", pb.external_id);
    return data;
  }

  const emailHash = user?.email ? hashMetaEmail(user.email) : null;
  if (emailHash) data.em = [emailHash];

  const phoneHash = user?.phone ? hashMetaPhone(user.phone) : null;
  if (phoneHash) data.ph = [phoneHash];

  const fnSource = user?.firstName || (user?.fullName ? firstNameFromFullName(user.fullName) : "");
  const fnHash = fnSource ? hashMetaName(fnSource) : null;
  if (fnHash) data.fn = [fnHash];

  const lnSource =
    user?.fullName && user.fullName.trim().includes(" ")
      ? user.fullName.trim().split(/\s+/).filter(Boolean).at(-1) ?? ""
      : "";
  const lnHash = lnSource ? hashMetaName(lnSource) : null;
  if (lnHash) data.ln = [lnHash];

  const cityHash = user?.city ? hashMetaCity(user.city) : null;
  if (cityHash) data.ct = [cityHash];

  const countryHash = hashMetaCountry(META_PIXEL_COUNTRY);
  if (countryHash) data.country = [countryHash];

  const externalHash = user?.externalId ? hashMetaExternalId(user.externalId) : null;
  if (externalHash) data.external_id = [externalHash];

  return data;
}

export function getMetaPixelId(): string | undefined {
  const fromServer = process.env.META_PIXEL_ID?.trim();
  const fromPublic = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return fromServer || fromPublic || undefined;
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(getMetaPixelId() && process.env.META_CAPI_ACCESS_TOKEN?.trim());
}

export async function sendMetaCapiEvent(input: MetaCapiEventInput): Promise<boolean> {
  const pixelId = getMetaPixelId();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();

  if (!pixelId || !accessToken) {
    console.warn("[meta-capi] skipped — missing pixel id or access token", input.eventName);
    return false;
  }

  if (!input.eventId.trim()) {
    console.warn("[meta-capi] skipped event without event_id", input.eventName);
    return false;
  }

  const customData = buildMetaCommerceData(input.commerce);
  if (input.productName) {
    (customData as Record<string, unknown>).content_name = input.productName;
  }

  const payload: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    user_data: buildUserData(input.user),
    custom_data: customData,
  };

  if (input.eventSourceUrl) {
    payload.event_source_url = input.eventSourceUrl;
  }

  if (input.referrerUrl) {
    payload.referrer_url = input.referrerUrl;
  }

  const body: Record<string, unknown> = {
    data: [payload],
  };

  const testCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  if (testCode) {
    body.test_event_code = testCode;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as { error?: { message?: string; code?: number }; events_received?: number };

    if (!res.ok) {
      console.error(
        "[meta-capi]",
        input.eventName,
        json.error?.code ?? res.status,
        json.error?.message ?? "request failed",
      );
      return false;
    }

    return (json.events_received ?? 0) > 0;
  } catch (error) {
    console.error("[meta-capi]", input.eventName, error instanceof Error ? error.message : "network error");
    return false;
  }
}


export { clientIpFromRequest } from "@/lib/meta-request-ip";
