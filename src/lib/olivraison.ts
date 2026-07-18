import "server-only";

const DEFAULT_BASE_URL = "https://partners.olivraison.com";

type TokenCache = {
  token: string;
  expiresAt: number;
};

type OlivraisonGlobal = typeof globalThis & {
  olivraisonTokenCache?: TokenCache;
  olivraisonLastRequestAt?: number;
};

export class OlivraisonError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "OlivraisonError";
  }
}

function configuration() {
  return {
    baseUrl: (process.env.OLIVRAISON_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    apiKey: process.env.OLIVRAISON_API_KEY?.trim() || "",
    secretKey: process.env.OLIVRAISON_SECRET_KEY?.trim() || "",
  };
}

export function isOlivraisonConfigured(): boolean {
  const { apiKey, secretKey } = configuration();
  return Boolean(apiKey && secretKey);
}

async function parseError(response: Response): Promise<OlivraisonError> {
  let body: { code?: string; description?: string; message?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // The API may return an empty or non-JSON gateway response.
  }
  return new OlivraisonError(
    body.description || body.message || `Olivraison request failed (${response.status})`,
    response.status,
    body.code,
  );
}

async function throttle(): Promise<void> {
  const state = globalThis as OlivraisonGlobal;
  const now = Date.now();
  const wait = Math.max(0, (state.olivraisonLastRequestAt ?? 0) + 210 - now);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  state.olivraisonLastRequestAt = Date.now();
}

async function login(force = false): Promise<string> {
  const state = globalThis as OlivraisonGlobal;
  const cached = state.olivraisonTokenCache;
  if (!force && cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const { baseUrl, apiKey, secretKey } = configuration();
  if (!apiKey || !secretKey) {
    throw new OlivraisonError(
      "Olivraison is not configured. Add OLIVRAISON_API_KEY and OLIVRAISON_SECRET_KEY.",
      503,
      "NOT_CONFIGURED",
    );
  }

  await throttle();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, secretKey }),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);

  const body = (await response.json()) as { token?: string };
  if (!body.token) {
    throw new OlivraisonError("Olivraison did not return an authentication token.", 502);
  }

  state.olivraisonTokenCache = {
    token: body.token,
    // The documented lifetime is seven days; refresh one hour early.
    expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000,
  };
  return body.token;
}

export async function olivraisonRequest<T>(
  path: string,
  init: RequestInit = {},
  retryAuthentication = true,
): Promise<T> {
  const { baseUrl } = configuration();
  const token = await login();
  await throttle();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (response.status === 401 && retryAuthentication) {
    await login(true);
    return olivraisonRequest<T>(path, init, false);
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
