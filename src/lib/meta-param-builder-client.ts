"use client";

/**
 * Meta client-side Parameter Builder — sets _fbc, _fbp, _fbi cookies per Meta docs.
 * @see https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameter-builder-library
 */

type ClientParamBuilder = {
  processAndCollectAllParams: (
    url?: string | null,
    getIpFn?: () => Promise<string> | string,
  ) => Promise<Record<string, string>>;
  getFbc: () => string;
  getFbp: () => string;
  getClientIpAddress: () => string;
};

let sdkPromise: Promise<ClientParamBuilder> | null = null;
let collectPromise: Promise<void> | null = null;

async function loadClientParamBuilder(): Promise<ClientParamBuilder> {
  if (!sdkPromise) {
    sdkPromise = import(
      "meta-capi-param-builder-clientjs/dist/clientParamBuilder.bundle.js"
    ).then((mod) => {
      const candidate =
        (mod as { clientParamBuilder?: ClientParamBuilder }).clientParamBuilder ??
        (mod as { default?: ClientParamBuilder }).default;
      if (!candidate?.processAndCollectAllParams) {
        throw new Error("Meta client ParamBuilder bundle missing exports");
      }
      return candidate;
    });
  }
  return sdkPromise;
}

/** Prefer IPv6 from our edge, fall back to IPv4 — used as Meta getIpFn. */
async function fetchClientIpForMetaCookie(): Promise<string> {
  const res = await fetch("/api/meta/client-ip", { credentials: "same-origin" });
  if (!res.ok) return "";
  const json = (await res.json()) as { ip?: string };
  return typeof json.ip === "string" ? json.ip : "";
}

/**
 * Run once per page load: writes _fbc/_fbp/_fbi cookies via Meta SDK.
 * Safe before marketing consent — first-party attribution cookies only.
 */
export function runClientMetaParamBuilder(): void {
  if (typeof window === "undefined") return;
  if (collectPromise) return;

  collectPromise = (async () => {
    try {
      const builder = await loadClientParamBuilder();
      await builder.processAndCollectAllParams(window.location.href, fetchClientIpForMetaCookie);
    } catch (error) {
      console.warn(
        "[meta-param-builder-client]",
        error instanceof Error ? error.message : "collect failed",
      );
    }
  })();
}

export async function whenClientMetaParamBuilderReady(): Promise<void> {
  if (collectPromise) await collectPromise;
}
