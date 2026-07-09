import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function trimOuterQuotes(value?: string): string {
  if (!value) return "";
  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
}

function resolveDatabaseUrlFromEnv(): string | undefined {
  const directUrl = trimOuterQuotes(process.env.DATABASE_URL);
  if (directUrl) return directUrl;

  const connection = trimOuterQuotes(process.env.DB_CONNECTION || "mysql");
  if (connection.toLowerCase() !== "mysql") return undefined;

  const host = trimOuterQuotes(process.env.DB_HOST);
  const port = trimOuterQuotes(process.env.DB_PORT || "3306");
  const database = trimOuterQuotes(process.env.DB_DATABASE);
  const username = trimOuterQuotes(process.env.DB_USERNAME);
  const password = trimOuterQuotes(process.env.DB_PASSWORD);

  if (!host || !database || !username) return undefined;

  const encodedUser = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const encodedDatabase = encodeURIComponent(database);

  return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;
}

const resolvedDatabaseUrl = resolveDatabaseUrlFromEnv();
if (resolvedDatabaseUrl && !process.env.DATABASE_URL) {
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
  // Dev hot-reload can keep an old client cached before new models are generated.
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
