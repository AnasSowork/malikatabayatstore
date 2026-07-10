import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function trimOuterQuotes(value?: string): string {
  if (!value) return "";
  let trimmed = value.trim().replace(/^\uFEFF/, "");
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
}

/** Prefer Hostinger-style DB_* vars over a stale DATABASE_URL. */
export function resolveDatabaseUrlFromEnv(): string | undefined {
  const host = trimOuterQuotes(process.env.DB_HOST || "localhost");
  const port = trimOuterQuotes(process.env.DB_PORT || "3306");
  const database = trimOuterQuotes(
    process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE,
  );
  const username = trimOuterQuotes(
    process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQL_USER,
  );
  const password = trimOuterQuotes(
    process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
  );

  if (database && username) {
    return `mysql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }

  const directUrl = trimOuterQuotes(process.env.DATABASE_URL);
  return directUrl || undefined;
}

export function getDbEnvDebug() {
  const password = trimOuterQuotes(
    process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
  );
  const database = trimOuterQuotes(
    process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE,
  );
  const username = trimOuterQuotes(
    process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQL_USER,
  );
  const host = trimOuterQuotes(process.env.DB_HOST || "localhost");
  const port = trimOuterQuotes(process.env.DB_PORT || "3306");
  const hasDatabaseUrl = Boolean(trimOuterQuotes(process.env.DATABASE_URL));
  const resolved = resolveDatabaseUrlFromEnv();

  let resolvedPreview = "(none)";
  if (resolved) {
    try {
      const u = new URL(resolved);
      resolvedPreview = `${u.protocol}//${u.username}:***@${u.host}${u.pathname}`;
    } catch {
      resolvedPreview = "(unparseable)";
    }
  }

  return {
    source: database && username ? "DB_*" : hasDatabaseUrl ? "DATABASE_URL" : "none",
    DB_HOST: host,
    DB_PORT: port,
    DB_USER: username || "(missing)",
    DB_NAME: database || "(missing)",
    DB_PASSWORD_length: password.length,
    DB_PASSWORD_set: password.length > 0,
    DATABASE_URL_set: hasDatabaseUrl,
    resolvedPreview,
  };
}

const resolvedDatabaseUrl = resolveDatabaseUrlFromEnv();
if (resolvedDatabaseUrl) {
  // Always apply resolved URL so DB_* wins over a stale DATABASE_URL in Hostinger.
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function isStalePrismaClient(client: PrismaClient | undefined): client is undefined {
  if (!client) return true;
  const c = client as PrismaClient & {
    category?: { findMany?: unknown };
    homeSection?: { findMany?: unknown };
  };
  return (
    typeof c.category?.findMany !== "function" ||
    typeof c.homeSection?.findMany !== "function"
  );
}

if (process.env.NODE_ENV !== "production" && isStalePrismaClient(globalForPrisma.prisma)) {
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
