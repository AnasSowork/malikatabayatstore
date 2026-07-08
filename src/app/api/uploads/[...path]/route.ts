import { readFile, stat } from "node:fs/promises";
import { join, normalize } from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

function mimeFromName(name: string): string | null {
  const i = name.lastIndexOf(".");
  if (i < 0) return null;
  const ext = name.slice(i).toLowerCase();
  return MIME_BY_EXT[ext] ?? null;
}

export async function GET(_: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!Array.isArray(path) || path.length < 2) {
    return NextResponse.json({ error: "Bad upload path" }, { status: 400 });
  }

  const [bucket, ...rest] = path;
  if (!(bucket === "p" || bucket === "products")) {
    return NextResponse.json({ error: "Unknown upload bucket" }, { status: 404 });
  }

  const filename = rest.join("/");
  const safeName = normalize(filename).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!safeName || safeName.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  // Legacy compatibility: `/api/uploads/products/*` reads from `/public/uploads/p/*`.
  const realBucket = bucket === "products" ? "p" : bucket;
  const abs = join(process.cwd(), "public", "uploads", realBucket, safeName);

  try {
    const file = await readFile(abs);
    const info = await stat(abs);
    if (!info.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const contentType = mimeFromName(safeName) ?? "application/octet-stream";
    return new NextResponse(file, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
