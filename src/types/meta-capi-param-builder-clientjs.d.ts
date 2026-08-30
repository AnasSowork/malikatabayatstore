declare module "meta-capi-param-builder-clientjs/dist/clientParamBuilder.bundle.js" {
  export const processAndCollectAllParams: (
    url?: string | null,
    getIpFn?: () => Promise<string> | string,
  ) => Promise<Record<string, string>>;
  export const getFbc: () => string;
  export const getFbp: () => string;
  export const getClientIpAddress: () => string;
}
