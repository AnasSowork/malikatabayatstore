/**
 * One-shot: strip Abaya/Malikat copy from live DB and align categories with NIRA MODE.
 * Preserves custom uploaded images on home sections where present.
 */
import { PrismaClient } from "@prisma/client";
import {
  defaultArticlesContent,
  defaultCampaignContent,
  defaultCategoryTilesContent,
  defaultFeaturedCollectionContent,
  defaultHeroContent,
  defaultValuePropsContent,
} from "../src/lib/home-content-defaults";

const prisma = new PrismaClient();

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

async function resetHomeSections() {
  const rows = await prisma.homeSection.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const heroDefault = defaultHeroContent();
  const existingHero = asRecord(byKey.get("hero")?.content);
  if (typeof existingHero.image === "string" && existingHero.image.trim()) {
    heroDefault.image = existingHero.image;
  }

  const campaignDefault = defaultCampaignContent();
  const existingCampaign = asRecord(byKey.get("campaign")?.content);
  if (typeof existingCampaign.image === "string" && existingCampaign.image.trim()) {
    campaignDefault.image = existingCampaign.image;
  }

  const featuredDefault = defaultFeaturedCollectionContent();
  const existingFeatured = asRecord(byKey.get("featured_collection")?.content);
  const featuredItems = Array.isArray(existingFeatured.items) ? existingFeatured.items : [];
  featuredDefault.items = featuredDefault.items.map((item, i) => {
    const prev = asRecord(featuredItems[i]);
    return {
      ...item,
      image: typeof prev.image === "string" && prev.image.trim() ? prev.image : item.image,
    };
  });

  const tilesDefault = defaultCategoryTilesContent();
  const existingTiles = asRecord(byKey.get("category_tiles")?.content);
  const tiles = Array.isArray(existingTiles.tiles) ? existingTiles.tiles : [];
  tilesDefault.tiles = tilesDefault.tiles.map((tile, i) => {
    const prev = asRecord(tiles[i]);
    return {
      ...tile,
      image: typeof prev.image === "string" && prev.image.trim() ? prev.image : tile.image,
    };
  });

  const updates: Record<string, unknown> = {
    hero: heroDefault,
    value_props: defaultValuePropsContent(),
    featured_collection: featuredDefault,
    articles: defaultArticlesContent(),
    campaign: campaignDefault,
    category_tiles: tilesDefault,
  };

  for (const [key, content] of Object.entries(updates)) {
    await prisma.homeSection.updateMany({
      where: { key },
      data: { content: content as object },
    });
  }
  console.log("[purge] home_sections text reset to NIRA MODE defaults (images preserved)");
}

function remapCategoryName(name: string): string {
  if (name === "Abaya") return "Essentials";
  if (name === "Prayer") return "Everyday";
  return name;
}

async function remapCategories() {
  const categories = await prisma.category.findMany();
  for (const cat of categories) {
    const nextName = remapCategoryName(cat.name);
    if (nextName === cat.name) {
      if (cat.name === "Essentials" || cat.nameAr?.includes("عباي") || cat.nameFr === "Abaya") {
        await prisma.category.update({
          where: { id: cat.id },
          data: {
            nameAr: cat.name === "Essentials" ? "أساسيات" : cat.nameAr,
            nameFr: cat.name === "Essentials" ? "Essentiels" : cat.nameFr,
          },
        });
      }
      continue;
    }

    const clash = await prisma.category.findUnique({ where: { name: nextName } });
    if (clash) {
      await prisma.category.delete({ where: { id: cat.id } });
      console.log(`[purge] removed duplicate category ${cat.name} (kept ${nextName})`);
      continue;
    }

    await prisma.category.update({
      where: { id: cat.id },
      data: {
        name: nextName,
        nameAr: nextName === "Essentials" ? "أساسيات" : nextName === "Everyday" ? "يومي" : cat.nameAr,
        nameFr: nextName === "Essentials" ? "Essentiels" : nextName === "Everyday" ? "Quotidien" : cat.nameFr,
      },
    });
    console.log(`[purge] category ${cat.name} → ${nextName}`);
  }
}

function remapProductCategories(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map(String) : [];
  return [...new Set(list.map(remapCategoryName))];
}

function scrubText(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value
    .replace(/\bMalikat\s*Abayat\b/gi, "NIRA MODE")
    .replace(/\bMalikatAbayat\b/gi, "NIRA MODE")
    .replace(/\bNiramode\b/g, "NIRA MODE")
    .replace(/\babayas\b/gi, "pieces")
    .replace(/\babaya\b/gi, "piece")
    .replace(/عبايات/g, "قطع")
    .replace(/العبايات/g, "الموضة")
    .replace(/عباية/g, "قطعة")
    .replace(/ملكة العبايات/g, "نيرا مود");
}

async function scrubProducts() {
  const products = await prisma.product.findMany();
  for (const p of products) {
    const categories = remapProductCategories(p.categories);
    const name = scrubText(p.name) ?? p.name;
    const nameFr = scrubText(p.nameFr);
    const nameAr = scrubText(p.nameAr);
    const description = scrubText(p.description) ?? p.description;
    const descriptionFr = scrubText(p.descriptionFr);
    const descriptionAr = scrubText(p.descriptionAr);

    await prisma.product.update({
      where: { id: p.id },
      data: {
        name,
        nameFr: nameFr ?? null,
        nameAr: nameAr ?? null,
        description,
        descriptionFr: descriptionFr ?? null,
        descriptionAr: descriptionAr ?? null,
        categories,
      },
    });
  }
  console.log(`[purge] scrubbed ${products.length} product(s)`);
}

async function main() {
  await resetHomeSections();
  await remapCategories();
  await scrubProducts();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
