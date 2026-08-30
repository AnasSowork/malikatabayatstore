import {
  ParamBuilder,
  PlainDataObject,
  PII_DATA_TYPE,
  type Cookies,
  type QueryParams,
} from "capi-param-builder-nodejs";
import { phoneForMetaHash } from "@/lib/meta-capi-hash";
import {
  firstNameFromFullName,
  lastNameFromFullName,
  META_PIXEL_COUNTRY,
} from "@/lib/meta-pixel-user";
import { clientIpFromRequest } from "@/lib/meta-request-ip";

const STORE_DOMAINS = ["malikatalabayat.com", "www.malikatalabayat.com"];

export type MetaCapiResolvedUserData = {
  fbp: string | null;
  fbc: string | null;
  clientIpAddress: string | null;
  clientUserAgent: string | null;
  eventSourceUrl: string | null;
  referrerUrl: string | null;
  hashed: {
    em: string | null;
    ph: string | null;
    fn: string | null;
    ln: string | null;
    ct: string | null;
    country: string | null;
    external_id: string | null;
  };
};

function parseCookieHeader(header: string | null): Cookies {
  const cookies: Cookies = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) cookies[name] = value;
  }
  return cookies;
}

function createParamBuilder(): ParamBuilder {
  return new ParamBuilder(STORE_DOMAINS);
}

function hashCustomerPii(
  builder: ParamBuilder,
  input: {
    phone?: string | null;
    fullName?: string | null;
    city?: string | null;
    externalId?: string | null;
    email?: string | null;
  },
): MetaCapiResolvedUserData["hashed"] {
  const phoneDigits = input.phone ? phoneForMetaHash(input.phone) : null;
  const ph = phoneDigits
    ? builder.getNormalizedAndHashedPII(phoneDigits, PII_DATA_TYPE.PHONE)
    : null;

  const fnRaw = input.fullName ? firstNameFromFullName(input.fullName) : "";
  const lnRaw = input.fullName ? lastNameFromFullName(input.fullName) : "";

  return {
    em: input.email
      ? builder.getNormalizedAndHashedPII(input.email, PII_DATA_TYPE.EMAIL)
      : null,
    ph,
    fn: fnRaw ? builder.getNormalizedAndHashedPII(fnRaw, PII_DATA_TYPE.FIRST_NAME) : null,
    ln: lnRaw ? builder.getNormalizedAndHashedPII(lnRaw, PII_DATA_TYPE.LAST_NAME) : null,
    ct: input.city ? builder.getNormalizedAndHashedPII(input.city, PII_DATA_TYPE.CITY) : null,
    country: builder.getNormalizedAndHashedPII(META_PIXEL_COUNTRY, PII_DATA_TYPE.COUNTRY),
    external_id: input.externalId
      ? builder.getNormalizedAndHashedPII(input.externalId, PII_DATA_TYPE.EXTERNAL_ID)
      : null,
  };
}

/** Hash order PII for lifecycle CAPI when no HTTP request is available. */
export function hashOrderPiiForCapi(order: {
  phone: string;
  customerName: string;
  city: string;
  id: string;
}): MetaCapiResolvedUserData["hashed"] {
  const builder = createParamBuilder();
  return hashCustomerPii(builder, {
    phone: order.phone,
    fullName: order.customerName,
    city: order.city,
    externalId: order.id,
  });
}

/**
 * Meta Parameter Builder (server): fbc/fbp from cookies + fbclid, IP, URLs, hashed PII.
 * @see https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameter-builder-library
 */
export function resolveMetaCapiUserFromRequest(
  request: Request,
  input: {
    fbclid?: string | null;
    landingEventSourceUrl?: string | null;
    checkoutEventSourceUrl?: string | null;
    clientFbp?: string | null;
    clientFbc?: string | null;
    phone?: string | null;
    fullName?: string | null;
    city?: string | null;
    externalId?: string | null;
  },
): MetaCapiResolvedUserData {
  const host = request.headers.get("host") ?? "malikatalabayat.com";
  const cookies = parseCookieHeader(request.headers.get("cookie"));

  if (input.clientFbp?.trim() && !cookies._fbp) cookies._fbp = input.clientFbp.trim();
  if (input.clientFbc?.trim() && !cookies._fbc) cookies._fbc = input.clientFbc.trim();

  const queryParams: QueryParams = {};
  const landingFbclid = (() => {
    if (!input.landingEventSourceUrl) return null;
    try {
      return new URL(input.landingEventSourceUrl).searchParams.get("fbclid");
    } catch {
      return null;
    }
  })();
  const fbclid = input.fbclid?.trim() || landingFbclid;
  if (fbclid) queryParams.fbclid = fbclid;

  let scheme = "https";
  let requestUri = "/";
  if (input.landingEventSourceUrl) {
    try {
      const landing = new URL(input.landingEventSourceUrl);
      scheme = landing.protocol.replace(":", "") || "https";
      requestUri = `${landing.pathname}${landing.search}`;
    } catch {
      /* ignore */
    }
  } else if (input.checkoutEventSourceUrl) {
    try {
      const checkout = new URL(input.checkoutEventSourceUrl);
      requestUri = `${checkout.pathname}${checkout.search}`;
    } catch {
      /* ignore */
    }
  }

  const builder = createParamBuilder();
  const plain = new PlainDataObject(
    host,
    queryParams,
    cookies,
    input.checkoutEventSourceUrl ?? request.headers.get("referer"),
    request.headers.get("x-forwarded-for"),
    null,
    scheme,
    requestUri,
  );
  builder.processRequestFromContext(plain);

  const hashed = hashCustomerPii(builder, input);

  return {
    fbp: builder.getFbp() ?? input.clientFbp?.trim() ?? null,
    fbc: builder.getFbc() ?? input.clientFbc?.trim() ?? null,
    clientIpAddress: builder.getClientIpAddress() ?? clientIpFromRequest(request),
    clientUserAgent: request.headers.get("user-agent"),
    eventSourceUrl: input.checkoutEventSourceUrl ?? builder.getEventSourceUrl(),
    referrerUrl: builder.getReferrerUrl(),
    hashed,
  };
}
