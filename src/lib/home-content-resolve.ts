import {
  pickLocalized,
  type ArticlesContent,
  type CampaignContent,
  type CategoryTilesContent,
  type FeaturedCollectionContent,
  type HeroContent,
  type LocalizedText,
  type ValuePropsContent,
} from "@/lib/home-content-types";
import type { AppLocale } from "@/lib/product-i18n";

function pick(text: LocalizedText, locale: AppLocale) {
  return pickLocalized(text, locale);
}

export function resolveHero(content: HeroContent, locale: AppLocale) {
  return {
    image: content.image,
    line1: pick(content.line1, locale),
    line2: pick(content.line2, locale),
    tagline: pick(content.tagline, locale),
    primaryCta: { label: pick(content.primaryCta.label, locale), href: content.primaryCta.href },
    secondaryCta: { label: pick(content.secondaryCta.label, locale), href: content.secondaryCta.href },
    showScrollHint: content.showScrollHint,
    scrollLabel: pick(content.scrollLabel, locale),
  };
}

export function resolveValueProps(content: ValuePropsContent, locale: AppLocale) {
  return {
    items: content.items.map((item) => ({
      icon: item.icon,
      title: pick(item.title, locale),
      body: pick(item.body, locale),
    })),
  };
}

export function resolveFeaturedCollection(content: FeaturedCollectionContent, locale: AppLocale) {
  return {
    eyebrow: pick(content.eyebrow, locale),
    title: pick(content.title, locale),
    titleItalic: pick(content.titleItalic, locale),
    titleEnd: pick(content.titleEnd, locale),
    viewAllLabel: pick(content.viewAllLabel, locale),
    viewAllHref: content.viewAllHref,
    items: content.items,
  };
}

export function resolveArticles(content: ArticlesContent, locale: AppLocale) {
  return {
    eyebrow: pick(content.eyebrow, locale),
    title: pick(content.title, locale),
    readLabel: pick(content.readLabel, locale),
    articles: content.items.map((item) => ({
      category: pick(item.category, locale),
      title: pick(item.title, locale),
      excerpt: pick(item.excerpt, locale),
      image: item.image,
      href: item.href,
    })),
  };
}

export function resolveCampaign(content: CampaignContent, locale: AppLocale) {
  return {
    image: content.image,
    eyebrow: pick(content.eyebrow, locale),
    title: pick(content.title, locale),
    titleItalic: pick(content.titleItalic, locale),
    body: pick(content.body, locale),
    ctaLabel: pick(content.ctaLabel, locale),
    href: content.href,
  };
}

export function resolveCategoryTiles(content: CategoryTilesContent, locale: AppLocale) {
  return {
    tiles: content.tiles.map((tile) => ({
      layout: tile.layout,
      image: tile.image,
      href: tile.href,
      title: pick(tile.title, locale),
      linkLabel: pick(tile.linkLabel, locale),
      subtitle: tile.subtitle ? pick(tile.subtitle, locale) : null,
    })),
  };
}

export type ResolvedHero = ReturnType<typeof resolveHero>;
export type ResolvedValueProps = ReturnType<typeof resolveValueProps>;
export type ResolvedFeaturedCollection = ReturnType<typeof resolveFeaturedCollection>;
export type ResolvedArticles = ReturnType<typeof resolveArticles>;
export type ResolvedCampaign = ReturnType<typeof resolveCampaign>;
export type ResolvedCategoryTiles = ReturnType<typeof resolveCategoryTiles>;
