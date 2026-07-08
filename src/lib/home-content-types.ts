import type { AppLocale } from "@/lib/product-i18n";

export type LocalizedText = {
  en: string;
  ar: string;
  fr: string;
};

export type HomeSectionKey =
  | "hero"
  | "value_props"
  | "featured_collection"
  | "articles"
  | "campaign"
  | "category_tiles";

export type HeroContent = {
  image: string;
  line1: LocalizedText;
  line2: LocalizedText;
  tagline: LocalizedText;
  primaryCta: { label: LocalizedText; href: string };
  secondaryCta: { label: LocalizedText; href: string };
  showScrollHint: boolean;
  scrollLabel: LocalizedText;
};

export type ValuePropsContent = {
  items: Array<{
    icon: string;
    title: LocalizedText;
    body: LocalizedText;
  }>;
};

export type FeaturedCollectionContent = {
  eyebrow: LocalizedText;
  title: LocalizedText;
  titleItalic: LocalizedText;
  titleEnd: LocalizedText;
  viewAllLabel: LocalizedText;
  viewAllHref: string;
  items: Array<{ image: string; href: string; shift: boolean }>;
};

export type ArticlesContent = {
  eyebrow: LocalizedText;
  title: LocalizedText;
  readLabel: LocalizedText;
  items: Array<{
    category: LocalizedText;
    title: LocalizedText;
    excerpt: LocalizedText;
    image: string;
    href: string;
  }>;
};

export type CampaignContent = {
  image: string;
  eyebrow: LocalizedText;
  title: LocalizedText;
  titleItalic: LocalizedText;
  body: LocalizedText;
  ctaLabel: LocalizedText;
  href: string;
};

export type CategoryTilesContent = {
  tiles: Array<{
    layout: "large" | "small";
    image: string;
    href: string;
    title: LocalizedText;
    linkLabel: LocalizedText;
    subtitle: LocalizedText | null;
  }>;
};

export type HomeSectionContent =
  | HeroContent
  | ValuePropsContent
  | FeaturedCollectionContent
  | ArticlesContent
  | CampaignContent
  | CategoryTilesContent;

export type HomeSectionForClient = {
  key: HomeSectionKey;
  enabled: boolean;
  sortOrder: number;
  content: HomeSectionContent;
};

export function pickLocalized(text: LocalizedText | null | undefined, locale: AppLocale): string {
  if (!text) return "";
  return text[locale]?.trim() || text.en?.trim() || text.ar?.trim() || text.fr?.trim() || "";
}

export function lt(en: string, ar: string, fr: string): LocalizedText {
  return { en, ar, fr };
}
