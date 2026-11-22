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
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
  next_page_url?: string | null;
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

  const pickup = process.env.SENDIT_PICKUP_DISTRICT_ID?.trim();
  const byId = new Map<number, SenditDistrict>();
  let lastPage = 1;

  for (let page = 1; page <= 50; page += 1) {
    const query = new URLSearchParams({
      querystring: city,
      page: String(page),
    });
    if (pickup && /^\d+$/.test(pickup)) {
      query.set("pickup-district", pickup);
    }

    const response = await senditRequest<DistrictsListResponse>(`/districts?${query.toString()}`);
    const rows = (response.data ?? [])
      .map((row) => toDistrict(row))
      .filter((d): d is SenditDistrict => Boolean(d));

    for (const district of rows) {
      byId.set(district.id, district);
    }

    const reportedLast =
      typeof response.last_page === "number" && response.last_page > 0
        ? response.last_page
        : page;
    lastPage = reportedLast;

    if (rows.length === 0 || page >= lastPage || !response.next_page_url) {
      break;
    }
  }

  const rows = [...byId.values()];
  cache.byQuery.set(cacheKey, rows);
  return rows;
}

/**
 * When a city (ville) has many Sendit districts, pick one for shipping.
 * Prefer a plain city row, then "Autres quartiers", else the shortest label.
 */
function pickPreferredDistrict(candidates: SenditDistrict[]): SenditDistrict {
  const list = candidates.filter((d) => d.active !== 0);
  const pool = list.length > 0 ? list : candidates;
  const plain = pool.find((d) => d.name.trim() === d.ville.trim());
  if (plain) return plain;
  const autres = pool.find((d) => /autres\s+quartiers/i.test(d.name));
  if (autres) return autres;
  return [...pool].sort(
    (a, b) =>
      a.name.length - b.name.length ||
      a.name.localeCompare(b.name, "fr") ||
      a.id - b.id,
  )[0]!;
}

function sameVilleGroup(candidates: SenditDistrict[]): string | null {
  if (candidates.length === 0) return null;
  const keys = new Set(candidates.map((d) => normalizeCityKey(d.ville)));
  if (keys.size !== 1) return null;
  return candidates[0]!.ville.trim() || null;
}

/**
 * Classify city match without fuzzy guessing.
 * EXACT_MATCH / SAFE_NORMALIZED_MATCH: unique district, or a shared ville
 * (e.g. "Casablanca") resolved to a preferred district for shipping.
 */
export async function classifySenditCityMatch(cityName: string): Promise<CityResolveResult> {
  const city = cityName.trim();
  if (city.length < 2) return { kind: "NOT_FOUND" };

  const rows = await fetchDistrictsForQuery(city);
  const active = rows.filter((d) => d.active !== 0);
  const want = normalizeCityKey(city);

  const exact = active.filter(
    (d) =>
      d.ville.trim() === city ||
      d.name.trim() === city ||
      (d.arabic_name ? d.arabic_name.trim() === city : false),
  );
  if (exact.length === 1) return { kind: "EXACT_MATCH", district: exact[0]! };
  if (exact.length > 1) {
    const ville = sameVilleGroup(exact);
    // Customer typed the city name (e.g. Casablanca) — collapse districts.
    if (ville && (ville === city || normalizeCityKey(ville) === want)) {
      return { kind: "EXACT_MATCH", district: pickPreferredDistrict(exact) };
    }
    return { kind: "AMBIGUOUS", candidates: exact };
  }

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
  if (matches.length > 1) {
    const ville = sameVilleGroup(matches);
    if (ville && normalizeCityKey(ville) === want) {
      return { kind: "SAFE_NORMALIZED_MATCH", district: pickPreferredDistrict(matches) };
    }
    return { kind: "AMBIGUOUS", candidates: matches };
  }
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
  districts: SenditDistrict[];
};

type DistrictNamesGlobal = typeof globalThis & {
  senditDistrictNamesCache?: DistrictNamesCache;
};

async function fetchAllSenditDistricts(): Promise<SenditDistrict[]> {
  const g = globalThis as DistrictNamesGlobal;
  const now = Date.now();
  const cached = g.senditDistrictNamesCache;
  if (cached && now - cached.fetchedAt <= DISTRICT_TTL_MS) {
    return cached.districts;
  }

  const byId = new Map<number, SenditDistrict>();
  const pickup = process.env.SENDIT_PICKUP_DISTRICT_ID?.trim();
  let emptyPages = 0;

  for (let page = 1; page <= 200; page += 1) {
    const query = new URLSearchParams({
      querystring: "",
      page: String(page),
    });
    if (pickup && /^\d+$/.test(pickup)) {
      query.set("pickup-district", pickup);
    }

    const response = await senditRequest<DistrictsListResponse>(`/districts?${query.toString()}`);
    const rows = (response.data ?? [])
      .map((row) => toDistrict(row))
      .filter((d): d is SenditDistrict => Boolean(d && d.active !== 0));

    if (rows.length === 0) {
      emptyPages += 1;
      if (emptyPages >= 2) break;
      continue;
    }
    emptyPages = 0;

    let newOnPage = 0;
    for (const district of rows) {
      if (!byId.has(district.id)) {
        byId.set(district.id, district);
        newOnPage += 1;
      }
    }
    // Stop when a page adds nothing new (API looping) or short page.
    if (newOnPage === 0 || rows.length < 15) break;
  }

  const districts = [...byId.values()].sort((a, b) =>
    (a.name || a.ville).localeCompare(b.name || b.ville, "fr"),
  );

  const names = new Set<string>();
  for (const district of districts) {
    const label = district.name.trim() || district.ville.trim();
    if (label) names.add(label);
    // Keep plain ville too when it differs (helps simple city entries).
    const ville = district.ville.trim();
    if (ville && ville !== label) names.add(ville);
  }

  const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "fr"));
  g.senditDistrictNamesCache = {
    fetchedAt: now,
    names: sortedNames,
    districts,
  };
  return districts;
}

/** Distinct Sendit district + city labels for admin autocomplete (cached 30 min). */
export async function listSenditCityNames(): Promise<string[]> {
  await fetchAllSenditDistricts();
  const cached = (globalThis as DistrictNamesGlobal).senditDistrictNamesCache;
  return cached?.names ?? [];
}

/**
 * Public checkout suggestions: unique Sendit cities (ville), not districts.
 * e.g. typing "Casa" → "Casablanca" only (not every Casablanca quarter).
 */
export async function searchSenditCitySuggestions(
  cityName: string,
  limit = 200,
): Promise<SenditDistrict[]> {
  const city = cityName.trim();
  if (city.length < 2) return [];

  const rows = await fetchDistrictsForQuery(city);
  const want = normalizeCityKey(city);
  const byVille = new Map<string, SenditDistrict[]>();

  for (const district of rows) {
    if (district.active === 0) continue;
    const ville = district.ville.trim();
    if (!ville) continue;
    const key = normalizeCityKey(ville);
    // Only surface city names that match what the customer typed.
    if (!key.includes(want) && !want.includes(key)) continue;
    const list = byVille.get(key) ?? [];
    list.push(district);
    byVille.set(key, list);
  }

  const collapsed: SenditDistrict[] = [];
  for (const group of byVille.values()) {
    const preferred = pickPreferredDistrict(group);
    const ville = preferred.ville.trim();
    collapsed.push({
      ...preferred,
      name: ville,
      ville,
    });
  }

  collapsed.sort((a, b) => {
    const aKey = normalizeCityKey(a.ville);
    const bKey = normalizeCityKey(b.ville);
    const aExact = aKey === want ? 0 : 1;
    const bExact = bKey === want ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aStarts = aKey.startsWith(want) ? 0 : 1;
    const bStarts = bKey.startsWith(want) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.ville.localeCompare(b.ville, "fr");
  });

  const capped = Math.max(1, Math.min(limit, 300));
  return collapsed.slice(0, capped);
}

/** Full active Sendit districts for admin autocomplete / mapping (cached 30 min). */
export async function listSenditDistricts(): Promise<SenditDistrict[]> {
  return fetchAllSenditDistricts();
}
