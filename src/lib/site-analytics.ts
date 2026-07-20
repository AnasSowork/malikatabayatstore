export type AnalyticsPathType = "home" | "products" | "product" | "thank_you" | "other";

export function classifyStorefrontPath(pathname: string): {
  pathType: AnalyticsPathType;
  productId: string;
} {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/" || path === "") {
    return { pathType: "home", productId: "" };
  }
  if (path === "/products") {
    return { pathType: "products", productId: "" };
  }
  if (path === "/thank-you") {
    return { pathType: "thank_you", productId: "" };
  }

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch?.[1]) {
    return { pathType: "product", productId: productMatch[1].slice(0, 64) };
  }

  return { pathType: "other", productId: "" };
}

export function utcDayStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function daysAgoUtc(days: number): Date {
  const d = utcDayStart();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}
