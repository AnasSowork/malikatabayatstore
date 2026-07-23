"use strict";

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

const app = next({ dev, dir: __dirname, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
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
