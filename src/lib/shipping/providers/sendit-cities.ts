import { senditRequest } from "@/lib/shipping/providers/sendit-client";

export type SenditDistrict = {
  id: number;
  ville: string;
  name: string;
  arabic_name?: string;
  active?: number;
  price?: number;
};

export type CityMatchKind = "EXACT_MATCH" | "SAFE_NORMALIZED_MATCH" | "AMBIGUOUS" | "NOT_FOUND";

export type CityResolveResult =
  | { kind: "EXACT_MATCH" | "SAFE_NORMALIZED_MATCH"; district: SenditDistrict }
  | { kind: "AMBIGUOUS"; candidates: SenditDistrict[] }
  | { kind: "NOT_FOUND" };

type DistrictsListResponse = {
  success?: boolean;
  data?: Array<{
    id?: number | string;
    ville?: string;
    name?: string;
    arabic_name?: string;
    active?: number;
  }>;
};

export class SenditCityMappingError extends Error {
  readonly code: "SENDIT_CITY_NOT_MAPPED" | "SENDIT_CITY_AMBIGUOUS";
  readonly matchKind: CityMatchKind;

  constructor(
    code: "SENDIT_CITY_NOT_MAPPED" | "SENDIT_CITY_AMBIGUOUS",
    message: string,
    matchKind: CityMatchKind,
  ) {
    super(message);
    this.name = "SenditCityMappingError";
    this.code = code;
    this.matchKind = matchKind;
  }
}

type DistrictCache = {
  fetchedAt: number;
  byQuery: Map<string, SenditDistrict[]>;
};

type DistrictGlobal = typeof globalThis & {
  senditDistrictCache?: DistrictCache;
};

const DISTRICT_TTL_MS = 30 * 60 * 1000; // 30 minutes

function normalizeCityKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toDistrict(row: {
  id?: number | string;
  ville?: string;
  name?: string;
  arabic_name?: string;
  active?: number;
}): SenditDistrict | null {
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const ville = typeof row.ville === "string" ? row.ville.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : ville;
  if (!ville && !name) return null;
  return {
    id,
    ville: ville || name,
    name: name || ville,
    arabic_name: typeof row.arabic_name === "string" ? row.arabic_name : undefined,
    active: typeof row.active === "number" ? row.active : undefined,
  };
}

function getCache(): DistrictCache {
  const g = globalThis as DistrictGlobal;
  const now = Date.now();
  if (!g.senditDistrictCache || now - g.senditDistrictCache.fetchedAt > DISTRICT_TTL_MS) {
    g.senditDistrictCache = { fetchedAt: now, byQuery: new Map() };
  }
  return g.senditDistrictCache;
}

async function fetchDistrictsForQuery(city: string): Promise<SenditDistrict[]> {
  const cache = getCache();
  const cacheKey = normalizeCityKey(city);
  const hit = cache.byQuery.get(cacheKey);
  if (hit) return hit;

  const query = new URLSearchParams({
    querystring: city,
    page: "1",
  });
  const pickup = process.env.SENDIT_PICKUP_DISTRICT_ID?.trim();
  if (pickup && /^\d+$/.test(pickup)) {
    query.set("pickup-district", pickup);
  }

  const response = await senditRequest<DistrictsListResponse>(`/districts?${query.toString()}`);
  const rows = (response.data ?? [])
    .map((row) => toDistrict(row))
    .filter((d): d is SenditDistrict => Boolean(d));

  cache.byQuery.set(cacheKey, rows);
  return rows;
}

/**
 * Classify city match without fuzzy guessing.
 * EXACT_MATCH: raw string equals ville/name (trim only)
 * SAFE_NORMALIZED_MATCH: accent/case/whitespace normalized equality
 */
export async function classifySenditCityMatch(cityName: string): Promise<CityResolveResult> {
  const city = cityName.trim();
  if (city.length < 2) return { kind: "NOT_FOUND" };

  const rows = await fetchDistrictsForQuery(city);
  const active = rows.filter((d) => d.active !== 0);

  const exact = active.filter(
    (d) =>
      d.ville.trim() === city ||
      d.name.trim() === city ||
      (d.arabic_name ? d.arabic_name.trim() === city : false),
  );
  if (exact.length === 1) return { kind: "EXACT_MATCH", district: exact[0]! };
  if (exact.length > 1) return { kind: "AMBIGUOUS", candidates: exact };

  const want = normalizeCityKey(city);
  const normalized = active.filter(
    (d) =>
      normalizeCityKey(d.ville) === want ||
      normalizeCityKey(d.name) === want ||
      (d.arabic_name ? normalizeCityKey(d.arabic_name) === want : false),
  );
  const unique = new Map<number, SenditDistrict>();
  for (const d of normalized) unique.set(d.id, d);
  const matches = [...unique.values()];
  if (matches.length === 1) return { kind: "SAFE_NORMALIZED_MATCH", district: matches[0]! };
  if (matches.length > 1) return { kind: "AMBIGUOUS", candidates: matches };
  return { kind: "NOT_FOUND" };
}

export async function resolveSenditDistrictId(cityName: string): Promise<SenditDistrict> {
  const result = await classifySenditCityMatch(cityName);
  if (result.kind === "EXACT_MATCH" || result.kind === "SAFE_NORMALIZED_MATCH") {
    return result.district;
  }
  if (result.kind === "AMBIGUOUS") {
    throw new SenditCityMappingError(
      "SENDIT_CITY_AMBIGUOUS",
      `City "${cityName.trim()}" matches multiple Sendit districts. Clarify the city name.`,
      "AMBIGUOUS",
    );
  }
  throw new SenditCityMappingError(
    "SENDIT_CITY_NOT_MAPPED",
    `City "${cityName.trim()}" is not mapped to a Sendit district.`,
    "NOT_FOUND",
  );
}

/** Best-effort lookup by merchant reference (Order.id) after ambiguous create failures. */
export async function findSenditCodeByReference(orderId: string): Promise<string | null> {
  const query = new URLSearchParams({
    querystring: orderId.trim(),
    page: "1",
  });
  const response = await senditRequest<{
    data?: Array<{ code?: string; reference?: string }>;
  }>(`/deliveries?${query.toString()}`);

  const want = orderId.trim();
  const hits = (response.data ?? []).filter(
    (row) => typeof row.reference === "string" && row.reference.trim() === want && row.code?.trim(),
  );
  if (hits.length === 1) return hits[0]!.code!.trim();
  return null;
}

export function getSenditPickupDistrictId(): number {
  const raw = process.env.SENDIT_PICKUP_DISTRICT_ID?.trim();
  if (raw && /^\d+$/.test(raw)) return Number(raw);
  return 46;
}

type DistrictNamesCache = {
  fetchedAt: number;
  names: string[];
};

type DistrictNamesGlobal = typeof globalThis & {
  senditDistrictNamesCache?: DistrictNamesCache;
};

/** Distinct Sendit city names for admin autocomplete (cached 30 min). */
export async function listSenditCityNames(): Promise<string[]> {
  const g = globalThis as DistrictNamesGlobal;
  const now = Date.now();
  const cached = g.senditDistrictNamesCache;
  if (cached && now - cached.fetchedAt <= DISTRICT_TTL_MS) {
    return cached.names;
  }

  const names = new Set<string>();
  const pickup = process.env.SENDIT_PICKUP_DISTRICT_ID?.trim();
  for (let page = 1; page <= 50; page += 1) {
    const query = new URLSearchParams({ querystring: "", page: String(page) });
    if (pickup && /^\d+$/.test(pickup)) {
      query.set("pickup-district", pickup);
    }
    const response = await senditRequest<DistrictsListResponse>(`/districts?${query.toString()}`);
    const rows = (response.data ?? [])
      .map((row) => toDistrict(row))
      .filter((d): d is SenditDistrict => Boolean(d && d.active !== 0));
    if (rows.length === 0) break;
    for (const district of rows) {
      names.add(district.ville.trim() || district.name.trim());
    }
    if (rows.length < 25) break;
  }

  const sorted = [...names].sort((a, b) => a.localeCompare(b, "fr"));
  g.senditDistrictNamesCache = { fetchedAt: now, names: sorted };
  return sorted;
}
