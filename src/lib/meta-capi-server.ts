import {
  firstNameFromFullName,
  hashMetaCity,
  hashMetaEmail,
  hashMetaExternalId,
  hashMetaName,
  hashMetaPhone,
} from "@/lib/meta-capi-hash";
import { buildMetaCommerceData, type MetaCommerceInput } from "@/lib/meta-commerce";

export type MetaCapiEventName = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

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
};

export type MetaCapiEventInput = {
  eventName: MetaCapiEventName;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string | null;
  commerce: MetaCommerceInput;
  productName?: string | null;
  user?: MetaCapiUserInput;
};

type GraphUserData = Record<string, string | string[]>;

function buildUserData(user?: MetaCapiUserInput): GraphUserData {
  const data: GraphUserData = {};

  if (user?.clientIpAddress) data.client_ip_address = user.clientIpAddress;
  if (user?.clientUserAgent) data.client_user_agent = user.clientUserAgent;
  if (user?.fbp) data.fbp = user.fbp;
  if (user?.fbc) data.fbc = user.fbc;

  const emailHash = user?.email ? hashMetaEmail(user.email) : null;
  if (emailHash) data.em = [emailHash];

  const phoneHash = user?.phone ? hashMetaPhone(user.phone) : null;
  if (phoneHash) data.ph = [phoneHash];

  const fnSource = user?.firstName || (user?.fullName ? firstNameFromFullName(user.fullName) : "");
  const fnHash = fnSource ? hashMetaName(fnSource) : null;
  if (fnHash) data.fn = [fnHash];

  const cityHash = user?.city ? hashMetaCity(user.city) : null;
  if (cityHash) data.ct = [cityHash];

  const externalHash = user?.externalId ? hashMetaExternalId(user.externalId) : null;
  if (externalHash) data.external_id = [externalHash];

  return data;
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(getMetaPixelId() && process.env.META_CAPI_ACCESS_TOKEN);
}

function getMetaPixelId(): string | undefined {
  return (
    process.env.META_PIXEL_ID ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID ||
    "1348553670819805"
  );
}

export async function sendMetaCapiEvent(input: MetaCapiEventInput): Promise<boolean> {
  const pixelId = getMetaPixelId();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
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

    const json = (await res.json()) as { error?: { message?: string }; events_received?: number };

    if (!res.ok) {
      console.error("[meta-capi]", input.eventName, json.error?.message ?? res.status);
      return false;
    }

    return (json.events_received ?? 0) > 0;
  } catch (error) {
    console.error("[meta-capi]", input.eventName, error);
    return false;
  }
}

export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || null;
}
