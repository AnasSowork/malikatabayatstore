"use strict";

console.log("[server] Starting nira-mode…");

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const next = require("next");

/** Hostinger Passenger does not always inject vars added only to `.env` later. */
function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const isPassenger = typeof PhusionPassenger !== "undefined";
const isHostingerPassenger = Boolean(process.env.LSNODE_SOCKET);
const dbHostOverride =
  process.env.HOSTINGER_DB_HOST_OVERRIDE ||
  (isHostingerPassenger ? "localhost" : undefined);

// Hostinger's MySQL service is local to its Passenger runtime. An explicit
// override remains available for other managed-hosting configurations.
if (dbHostOverride) {
  process.env.DB_HOST = dbHostOverride;
}

// Hostinger Passenger sets HOME to the domain folder. Pin uploads to the real
// account home so product photos survive app redeploys.
if (!process.env.UPLOAD_STORAGE_DIR) {
  const domainsMarker = `${path.sep}domains${path.sep}`;
  const cwd = process.cwd();
  const domainsIndex = cwd.indexOf(domainsMarker);
  const accountHome =
    domainsIndex > 0
      ? cwd.slice(0, domainsIndex)
      : process.env.HOME && process.env.HOME.includes(domainsMarker)
        ? process.env.HOME.slice(0, process.env.HOME.indexOf(domainsMarker))
        : null;
  if (accountHome) {
    process.env.UPLOAD_STORAGE_DIR = path.join(
      accountHome,
      ".malikat-abayat",
      "uploads",
      "p",
    );
  }
}

if (isPassenger) {
  PhusionPassenger.configure({ autoInstall: false });
}

function trimEnv(value) {
  if (!value) return "";
  let trimmed = String(value).trim().replace(/^\uFEFF/, "");
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
}

/** Prisma CLI reads DATABASE_URL. Hostinger only injects DB_* into the app. */
function resolveDatabaseUrlFromDbEnv() {
  const database = trimEnv(
    process.env.DB_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE,
  );
  const username = trimEnv(
    process.env.DB_USERNAME || process.env.DB_USER || process.env.MYSQL_USER,
  );
  const password = trimEnv(process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD);
  const host = trimEnv(process.env.DB_HOST || "localhost");
  const port = trimEnv(process.env.DB_PORT || "3306");

  if (database && username) {
    process.env.DATABASE_URL = `mysql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
    return true;
  }

  const direct = trimEnv(process.env.DATABASE_URL);
  if (direct.startsWith("mysql://")) {
    process.env.DATABASE_URL = direct;
    return true;
  }
  return false;
}

function logServer(level, message) {
  const safe = String(message).replace(/mysql:\/\/[^@\s]+@/g, "mysql://***@");
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message: safe.slice(0, 2000),
    }),
  );
}

function runPrisma(args) {
  const { spawn } = require("node:child_process");
  const prismaCli = path.join(__dirname, "node_modules", "prisma", "build", "index.js");
  const useLocal = fs.existsSync(prismaCli);
  return new Promise((resolve) => {
    const child = spawn(
      useLocal ? process.execPath : "npx",
      useLocal ? [prismaCli, ...args] : ["prisma", ...args],
      { cwd: __dirname, env: process.env },
    );
    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      output += chunk;
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      logServer("error", `prisma ${args.join(" ")} timed out`);
      resolve({ code: 1, output });
    }, 90000);
    child.on("error", (err) => {
      clearTimeout(timer);
      logServer("error", `prisma ${args.join(" ")} failed to start: ${err.message}`);
      resolve({ code: 1, output });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, output });
    });
  });
}

function runMigrationsBeforeListen() {
  if (dev) return Promise.resolve();
  if (!resolveDatabaseUrlFromDbEnv()) {
    logServer("warn", "skipping prisma migrate deploy; database url is not configured");
    return Promise.resolve();
  }

  const migration = "20261112010000_product_delivery_fee";
  return runPrisma(["migrate", "deploy"]).then(async (result) => {
    const tail = result.output.trim().slice(-1500);
    logServer(
      result.code === 0 ? "info" : "error",
      `prisma migrate deploy exit ${result.code}${tail ? `: ${tail}` : ""}`,
    );
    if (result.code === 0) return;

    // The column may already exist from the request-path patch, which makes
    // this migration fail with a duplicate column. Mark that one migration applied.
    if (!/deliveryFee|duplicate column|1060/i.test(result.output)) return;
    await runPrisma(["migrate", "resolve", "--rolled-back", migration]);
    const applied = await runPrisma(["migrate", "resolve", "--applied", migration]);
    logServer(
      applied.code === 0 ? "info" : "error",
      `prisma migrate resolve --applied ${migration} exit ${applied.code}: ${applied.output.trim().slice(-800)}`,
    );
  });
}

const app = next({ dev, dir: __dirname, hostname, port });
const handle = app.getRequestHandler();

Promise.all([app.prepare(), runMigrationsBeforeListen()])
  .then(() => {
    const server = http.createServer((request, response) => {
      handle(request, response);
    });

    server.on("error", (error) => {
      console.error("[server] HTTP server error:", error);
      process.exit(1);
    });

    if (isPassenger) {
      server.listen("passenger", () => {
        console.log("[server] Next.js listening through Phusion Passenger");
        console.log("[server] UPLOAD_STORAGE_DIR=", process.env.UPLOAD_STORAGE_DIR || "(unset)");
      });
      return;
    }

    server.listen(port, hostname, () => {
      console.log(`[server] Next.js listening on http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("[server] Failed to prepare Next.js:", error);
    process.exit(1);
  });
