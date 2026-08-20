/**
 * Low-level Sendit HTTP client (API v1 OpenAPI: https://app.sendit.ma/docs/api-docs.json).
 * Auth: POST /login { public_key, secret_key } → Bearer JWT.
 */

const DEFAULT_BASE_URL = "https://app.sendit.ma/api/v1";
const REQUEST_TIMEOUT_MS = 20_000;

type TokenCache = { token: string; fetchedAt: number };

type SenditGlobal = typeof globalThis & {
  senditTokenCache?: TokenCache;
};

export class SenditApiError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(message: string, httpStatus = 500, code = "SENDIT_API_ERROR") {
    super(message);
    this.name = "SenditApiError";
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

export function getSenditBaseUrl(): string {
  const raw = process.env.SENDIT_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function isSenditConfigured(): boolean {
  return Boolean(
    process.env.SENDIT_PUBLIC_KEY?.trim() && process.env.SENDIT_SECRET_KEY?.trim(),
  );
}

function authCredentials(): { public_key: string; secret_key: string } {
  const public_key = process.env.SENDIT_PUBLIC_KEY?.trim() ?? "";
  const secret_key = process.env.SENDIT_SECRET_KEY?.trim() ?? "";
  if (!public_key || !secret_key) {
    throw new SenditApiError(
      "Sendit is not configured. Add SENDIT_PUBLIC_KEY and SENDIT_SECRET_KEY.",
      503,
      "SENDIT_NOT_CONFIGURED",
    );
  }
  return { public_key, secret_key };
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new SenditApiError("Sendit did not respond in time.", 504, "SENDIT_TIMEOUT");
    }
    throw new SenditApiError(
      error instanceof Error ? error.message : "Could not reach Sendit.",
      502,
      "SENDIT_NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function loginForToken(): Promise<string> {
  const body = authCredentials();
  const res = await fetchWithTimeout(`${getSenditBaseUrl()}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { token?: string };
    message?: string;
    error?: string;
  };

  if (!res.ok || !json.data?.token?.trim()) {
    console.error("[sendit] login failed", res.status);
    throw new SenditApiError(
      "Sendit authentication failed.",
      res.status === 401 ? 401 : 502,
      "SENDIT_AUTH_FAILED",
    );
  }

  const token = json.data.token.trim();
  (globalThis as SenditGlobal).senditTokenCache = {
    token,
    fetchedAt: Date.now(),
  };
  return token;
}

async function getBearerToken(forceRefresh = false): Promise<string> {
  const cache = (globalThis as SenditGlobal).senditTokenCache;
  // JWT lifetime unknown; refresh hourly or on demand.
  if (!forceRefresh && cache?.token && Date.now() - cache.fetchedAt < 50 * 60 * 1000) {
    return cache.token;
  }
  return loginForToken();
}

function sanitizeUpstreamMessage(message: string | undefined): string {
  if (!message?.trim()) return "Sendit request failed.";
  // Never echo credentials or long payloads.
  return message.trim().slice(0, 240);
}

export async function senditRequest<T>(
  path: string,
  init: RequestInit = {},
  retryAuth = true,
): Promise<T> {
  const token = await getBearerToken();
  const url = `${getSenditBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetchWithTimeout(url, { ...init, headers });

  if (res.status === 401 && retryAuth) {
    await loginForToken();
    return senditRequest<T>(path, init, false);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    error?: string;
    data?: unknown;
  };

  if (!res.ok) {
    console.error("[sendit]", path.split("?")[0], res.status);
    throw new SenditApiError(
      sanitizeUpstreamMessage(json.message || json.error),
      res.status >= 400 && res.status < 600 ? res.status : 502,
      "SENDIT_API_ERROR",
    );
  }

  return json as T;
}
