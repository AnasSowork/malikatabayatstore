import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "p");
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

export type MediaItem = {
  url: string;
  name: string;
  source: "upload" | "product";
  updatedAt: string;
};

function productImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

export async function GET() {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const byUrl = new Map<string, MediaItem>();

    try {
      const files = await readdir(UPLOAD_DIR);
      await Promise.all(
        files.map(async (name) => {
          if (!IMAGE_EXT.test(name)) return;
          const filepath = join(UPLOAD_DIR, name);
          const st = await stat(filepath);
          if (!st.isFile()) return;
          const url = `/api/uploads/p/${name}`;
          byUrl.set(url, {
            url,
            name,
            source: "upload",
            updatedAt: st.mtime.toISOString(),
          });
        }),
      );
    } catch {
      // uploads folder may not exist yet
    }

    const products = await prisma.product.findMany({ select: { images: true } });
    for (const product of products) {
      for (const url of productImageUrls(product.images)) {
        if (byUrl.has(url)) continue;
        const name = url.split("/").pop() ?? url;
        byUrl.set(url, {
          url,
          name,
          source: "product",
          updatedAt: new Date(0).toISOString(),
        });
      }
    }

    const items = [...byUrl.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}
