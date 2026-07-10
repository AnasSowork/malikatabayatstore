import {
  HOME_SECTION_ORDER,
  HOME_SECTION_SORT,
  defaultHomeSectionContent,
} from "@/lib/home-content-defaults";
import type {
  HomeSectionContent,
  HomeSectionForClient,
  HomeSectionKey,
} from "@/lib/home-content-types";
import { prisma } from "@/lib/prisma";

const VALID_KEYS = new Set<string>(HOME_SECTION_ORDER);

export function isHomeSectionKey(key: string): key is HomeSectionKey {
  return VALID_KEYS.has(key);
}

function serializeRow(row: {
  key: string;
  enabled: boolean;
  sortOrder: number;
  content: unknown;
}): HomeSectionForClient {
  return {
    key: row.key as HomeSectionKey,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    content: row.content as HomeSectionContent,
  };
}

/** Ensures all home sections exist with defaults (idempotent). */
export async function ensureHomeSections(): Promise<void> {
  const existing = await prisma.homeSection.findMany({ select: { key: true } });
  const have = new Set(existing.map((r) => r.key));

  for (const key of HOME_SECTION_ORDER) {
    if (have.has(key)) continue;
    await prisma.homeSection.create({
      data: {
        key,
        enabled: true,
        sortOrder: HOME_SECTION_SORT[key],
        content: defaultHomeSectionContent(key),
      },
    });
  }
}

function defaultSectionsFallback(): HomeSectionForClient[] {
  return HOME_SECTION_ORDER.map((key) => ({
    key,
    enabled: true,
    sortOrder: HOME_SECTION_SORT[key],
    content: defaultHomeSectionContent(key),
  }));
}

export async function listHomeSections(): Promise<HomeSectionForClient[]> {
  try {
    await ensureHomeSections();
    const rows = await prisma.homeSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    });
    return rows.map(serializeRow);
  } catch (e) {
    console.error("[home-content] listHomeSections failed — using defaults:", e);
    return defaultSectionsFallback();
  }
}

export async function getHomeSection(key: HomeSectionKey): Promise<HomeSectionForClient | null> {
  await ensureHomeSections();
  const row = await prisma.homeSection.findUnique({ where: { key } });
  return row ? serializeRow(row) : null;
}
