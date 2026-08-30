function isIpv6(value: string): boolean {
  return value.includes(":");
}

/** Meta recommends IPv6 over IPv4 when available in x-forwarded-for. */
export function preferIpv6FromForwarded(forwarded: string | null): string | null {
  if (!forwarded) return null;
  const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
  const ipv6 = hops.find(isIpv6);
  if (ipv6) return ipv6;
  return hops[0] ?? null;
}

export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const fromForwarded = preferIpv6FromForwarded(forwarded);
  if (fromForwarded) return fromForwarded;
  return request.headers.get("x-real-ip")?.trim() || null;
}
