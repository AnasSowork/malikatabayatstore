import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { resolveImageMimeAndExt } from "@/lib/detect-image-upload";

export const runtime = "nodejs";

/** Under `public/uploads/p/`; served via `/api/uploads/p/...` to avoid locale-route collisions. */
const UPLOAD_SUBDIR = join("public", "uploads", "p");
const MAX_FILES = 12;
const MAX_BYTES = 6 * 1024 * 1024;

export type UploadResultItem =
  | { ok: true; url: string }
  | { ok: false; error: string; filename: string };

export async function POST(request: Request) {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const entries = formData.getAll("file");
    const files = entries.filter((e): e is File => e instanceof File && e.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `At most ${MAX_FILES} images per request` }, { status: 400 });
    }

    const dir = join(process.cwd(), UPLOAD_SUBDIR);
    await mkdir(dir, { recursive: true });

    const results: UploadResultItem[] = [];

    for (const file of files) {
      const filename = file.name || "image";
      if (file.size > MAX_BYTES) {
        results.push({
          ok: false,
          filename,
          error: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB)`,
        });
        continue;
      }

      const declared = file.type || "";
      if (declared && !declared.startsWith("image/") && declared !== "application/octet-stream") {
        results.push({
          ok: false,
          filename,
          error: "Not an image file",
        });
        continue;
      }

      let buf: Buffer;
      try {
        buf = Buffer.from(await file.arrayBuffer());
      } catch {
        results.push({ ok: false, filename, error: "Could not read file" });
        continue;
      }

      const resolved = resolveImageMimeAndExt(declared, filename, buf);
      if ("error" in resolved) {
        results.push({ ok: false, filename, error: resolved.error });
        continue;
      }

      const name = `${randomUUID()}${resolved.ext}`;
      try {
        const filepath = join(dir, name);
        await writeFile(filepath, buf);
        const st = await stat(filepath);
        if (st.size === 0) {
          results.push({ ok: false, filename, error: "Saved file was empty" });
          continue;
        }
        results.push({ ok: true, url: `/api/uploads/p/${name}` });
      } catch (e) {
        console.error(e);
        results.push({ ok: false, filename, error: "Failed to save file on server" });
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
