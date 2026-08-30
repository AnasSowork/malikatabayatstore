/** Public storefront base URL for CAPI event_source_url on backfill. */
export function metaStoreBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://malikatalabayat.com";
}

export function metaProductEventSourceUrl(productId: string): string {
  return `${metaStoreBaseUrl()}/products/${productId}`;
}
