import { HomeCategoryTilesSection } from "@/components/home/HomeCategoryTilesSection";
import { HomeEditSection } from "@/components/home/HomeEditSection";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeValuePropsSection } from "@/components/home/HomeValuePropsSection";
import { listHomeSections } from "@/lib/home-content";
import {
  resolveCategoryTiles,
  resolveHero,
  resolveValueProps,
} from "@/lib/home-content-resolve";
import type {
  CategoryTilesContent,
  HeroContent,
  ValuePropsContent,
} from "@/lib/home-content-types";
import type { AppLocale } from "@/lib/product-i18n";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/product-serialize";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const appLocale = locale as AppLocale;
  const sections = await listHomeSections();
  const byKey = new Map(sections.map((section) => [section.key, section]));

  const hero = byKey.get("hero");
  const tiles = byKey.get("category_tiles");
  const values = byKey.get("value_props");

  let products: ReturnType<typeof serializeProduct>[] = [];
  try {
    products = (await prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 8 })).map(
      serializeProduct,
    );
  } catch (error) {
    console.error("[home] product edit failed:", error);
  }

  return (
    <div className="bg-brand-ivory">
      {hero?.enabled ? (
        <HomeHeroSection {...resolveHero(hero.content as HeroContent, appLocale)} />
      ) : null}
      <HomeEditSection products={products} />
      {tiles?.enabled ? (
        <HomeCategoryTilesSection
          {...resolveCategoryTiles(tiles.content as CategoryTilesContent, appLocale)}
        />
      ) : null}
      {values?.enabled ? (
        <HomeValuePropsSection {...resolveValueProps(values.content as ValuePropsContent, appLocale)} />
      ) : null}
    </div>
  );
}
