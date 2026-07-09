"use strict";

const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const port = String(process.env.PORT || "3000");
const hostname = process.env.HOSTNAME || "0.0.0.0";

console.log("[hostinger-start] cwd:", process.cwd());
console.log("[hostinger-start] PORT:", port);
console.log("[hostinger-start] HOSTNAME:", hostname);
console.log("[hostinger-start] NODE_ENV:", process.env.NODE_ENV || "(unset)");

const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const buildDir = path.join(process.cwd(), ".next");
if (!existsSync(buildDir)) {
  console.error("[hostinger-start] Missing .next build output — run npm run build first.");
  process.exit(1);
}

const cmd = existsSync(nextBin) ? process.execPath : "npx";
const args = existsSync(nextBin)
  ? [nextBin, "start", "-p", port, "-H", hostname]
  : ["next", "start", "-p", port, "-H", hostname];

const result = spawnSync(cmd, args, {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
