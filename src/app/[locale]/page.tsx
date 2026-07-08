import { ArticlesSlider } from "@/components/home/ArticlesSlider";
import { HomeCampaignSection } from "@/components/home/HomeCampaignSection";
import { HomeCategoryTilesSection } from "@/components/home/HomeCategoryTilesSection";
import { HomeFeaturedCollectionSection } from "@/components/home/HomeFeaturedCollectionSection";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeValuePropsSection } from "@/components/home/HomeValuePropsSection";
import { listHomeSections } from "@/lib/home-content";
import {
  resolveArticles,
  resolveCampaign,
  resolveCategoryTiles,
  resolveFeaturedCollection,
  resolveHero,
  resolveValueProps,
} from "@/lib/home-content-resolve";
import type {
  ArticlesContent,
  CampaignContent,
  CategoryTilesContent,
  FeaturedCollectionContent,
  HeroContent,
  HomeSectionKey,
  ValuePropsContent,
} from "@/lib/home-content-types";
import type { AppLocale } from "@/lib/product-i18n";
import type { ReactNode } from "react";

function Ornament() {
  return (
    <div className="brand-ornament my-2" aria-hidden>
      <span className="brand-ornament-diamond" />
    </div>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const appLocale = locale as AppLocale;
  const sections = (await listHomeSections()).filter((s) => s.enabled);
  const enabledKeys = new Set(sections.map((s) => s.key));

  const nodes: ReactNode[] = [];

  for (const section of sections) {
    if (
      section.key === "articles" &&
      enabledKeys.has("featured_collection")
    ) {
      nodes.push(<Ornament key="ornament" />);
    }

    switch (section.key as HomeSectionKey) {
      case "hero":
        nodes.push(
          <HomeHeroSection
            key="hero"
            {...resolveHero(section.content as HeroContent, appLocale)}
          />,
        );
        break;
      case "value_props":
        nodes.push(
          <HomeValuePropsSection
            key="value_props"
            {...resolveValueProps(section.content as ValuePropsContent, appLocale)}
          />,
        );
        break;
      case "featured_collection":
        nodes.push(
          <HomeFeaturedCollectionSection
            key="featured_collection"
            {...resolveFeaturedCollection(section.content as FeaturedCollectionContent, appLocale)}
          />,
        );
        break;
      case "articles":
        nodes.push(
          <ArticlesSlider
            key="articles"
            {...resolveArticles(section.content as ArticlesContent, appLocale)}
          />,
        );
        break;
      case "campaign":
        nodes.push(
          <HomeCampaignSection
            key="campaign"
            {...resolveCampaign(section.content as CampaignContent, appLocale)}
          />,
        );
        break;
      case "category_tiles":
        nodes.push(
          <HomeCategoryTilesSection
            key="category_tiles"
            {...resolveCategoryTiles(section.content as CategoryTilesContent, appLocale)}
          />,
        );
        break;
    }
  }

  return <div className="bg-surface">{nodes}</div>;
}
