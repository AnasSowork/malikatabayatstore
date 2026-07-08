"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { AdminLocalizedField, AdminTextField } from "@/components/admin/AdminLocalizedField";
import { AdminSingleImagePicker } from "@/components/admin/AdminSingleImagePicker";
import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";
import type {
  ArticlesContent,
  CampaignContent,
  CategoryTilesContent,
  FeaturedCollectionContent,
  HeroContent,
  HomeSectionContent,
  HomeSectionForClient,
  HomeSectionKey,
  LocalizedText,
  ValuePropsContent,
} from "@/lib/home-content-types";
import { lt } from "@/lib/home-content-types";

type Props = {
  sections: HomeSectionForClient[];
  saving: boolean;
  onSave: (key: HomeSectionKey, payload: { enabled: boolean; content: HomeSectionContent }) => Promise<void>;
};

const SECTION_META: Record<
  HomeSectionKey,
  { labelKey: string; icon: string }
> = {
  hero: { labelKey: "homeSectionHero", icon: "view_carousel" },
  value_props: { labelKey: "homeSectionValues", icon: "verified" },
  featured_collection: { labelKey: "homeSectionFeatured", icon: "grid_view" },
  articles: { labelKey: "homeSectionArticles", icon: "article" },
  campaign: { labelKey: "homeSectionCampaign", icon: "campaign" },
  category_tiles: { labelKey: "homeSectionCategories", icon: "dashboard" },
};

function ItemCard({
  title,
  imageUrl,
  children,
}: {
  title: string;
  imageUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-home-item-card">
      <div className="admin-home-item-card-head">
        <div className="admin-home-item-thumb">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={normalizeProductImageSrc(imageUrl)} alt="" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-container">
              <MaterialIcon name="image" className="!text-lg text-on-surface-variant" />
            </div>
          )}
        </div>
        <p className="flex-1 text-sm font-medium text-on-surface">{title}</p>
      </div>
      <div className="admin-home-item-card-body">{children}</div>
    </div>
  );
}

export function AdminHomeView({ sections, saving, onSave }: Props) {
  const t = useTranslations("admin");
  const [activeKey, setActiveKey] = useState<HomeSectionKey>("hero");
  const [draft, setDraft] = useState<HomeSectionForClient | null>(null);
  const [error, setError] = useState("");
  const uploadBusyRef = useRef(0);
  const [uploadBusy, setUploadBusy] = useState(false);

  const setPickerBusy = useCallback((busy: boolean) => {
    uploadBusyRef.current = Math.max(0, uploadBusyRef.current + (busy ? 1 : -1));
    setUploadBusy(uploadBusyRef.current > 0);
  }, []);

  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key)),
    [sections],
  );

  const current = draft ?? sorted.find((s) => s.key === activeKey) ?? sorted[0];
  const hasDraft = draft !== null;

  function selectSection(key: HomeSectionKey) {
    setActiveKey(key);
    setDraft(null);
    setError("");
  }

  function updateContent(content: HomeSectionContent) {
    if (!current) return;
    setDraft({ ...current, content });
  }

  function updateEnabled(enabled: boolean) {
    if (!current) return;
    setDraft({ ...current, enabled });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setError("");
    try {
      await onSave(current.key, { enabled: current.enabled, content: current.content });
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("homeSaveError"));
    }
  }

  function setLocalized(path: string[], value: LocalizedText) {
    if (!current) return;
    const content = structuredClone(current.content) as Record<string, unknown>;
    let node: Record<string, unknown> = content;
    for (let i = 0; i < path.length - 1; i++) {
      node = node[path[i]!] as Record<string, unknown>;
    }
    node[path[path.length - 1]!] = value;
    updateContent(content as HomeSectionContent);
  }

  function renderImageField(
    label: string,
    value: string,
    onChange: (url: string) => void,
    aspect: "video" | "portrait" | "wide" | "square" = "wide",
  ) {
    return (
      <AdminSingleImagePicker
        label={label}
        value={value}
        onChange={onChange}
        aspect={aspect}
        onBusyChange={setPickerBusy}
        disabled={saving}
      />
    );
  }

  function renderEditor() {
    if (!current) return null;
    const c = current.content;

    switch (current.key) {
      case "hero": {
        const content = c as HeroContent;
        return (
          <div className="admin-home-text-block">
            {renderImageField(t("homeImage"), content.image, (image) => updateContent({ ...content, image }), "video")}
            <AdminLocalizedField label={t("homeHeroLine1")} value={content.line1} onChange={(v) => setLocalized(["line1"], v)} />
            <AdminLocalizedField label={t("homeHeroLine2")} value={content.line2} onChange={(v) => setLocalized(["line2"], v)} />
            <AdminLocalizedField label={t("homeHeroTagline")} value={content.tagline} onChange={(v) => setLocalized(["tagline"], v)} multiline />
            <div className="admin-home-divider" />
            <AdminLocalizedField
              label={t("homePrimaryCta")}
              value={content.primaryCta.label}
              onChange={(v) => updateContent({ ...content, primaryCta: { ...content.primaryCta, label: v } })}
            />
            <AdminTextField
              label={t("homePrimaryCtaLink")}
              value={content.primaryCta.href}
              onChange={(href) => updateContent({ ...content, primaryCta: { ...content.primaryCta, href } })}
              placeholder="/products"
            />
            <AdminLocalizedField
              label={t("homeSecondaryCta")}
              value={content.secondaryCta.label}
              onChange={(v) => updateContent({ ...content, secondaryCta: { ...content.secondaryCta, label: v } })}
            />
            <AdminTextField
              label={t("homeSecondaryCtaLink")}
              value={content.secondaryCta.href}
              onChange={(href) => updateContent({ ...content, secondaryCta: { ...content.secondaryCta, href } })}
              placeholder="/products?category=New"
            />
            <label className="admin-home-toggle">
              <input type="checkbox" checked={content.showScrollHint} onChange={(e) => updateContent({ ...content, showScrollHint: e.target.checked })} />
              <span>{t("homeShowScroll")}</span>
            </label>
            <AdminLocalizedField label={t("homeScrollLabel")} value={content.scrollLabel} onChange={(v) => setLocalized(["scrollLabel"], v)} />
          </div>
        );
      }
      case "value_props": {
        const content = c as ValuePropsContent;
        return (
          <div className="space-y-4">
            {content.items.map((item, i) => (
              <ItemCard key={i} title={t("homeValueItem", { n: i + 1 })}>
                <AdminTextField
                  label={t("homeIcon")}
                  value={item.icon}
                  onChange={(icon) => {
                    const items = [...content.items];
                    items[i] = { ...item, icon };
                    updateContent({ items });
                  }}
                  placeholder="local_shipping"
                />
                <AdminLocalizedField
                  label={t("homeTitle")}
                  value={item.title}
                  onChange={(title) => {
                    const items = [...content.items];
                    items[i] = { ...item, title };
                    updateContent({ items });
                  }}
                />
                <AdminLocalizedField
                  label={t("homeBody")}
                  value={item.body}
                  onChange={(body) => {
                    const items = [...content.items];
                    items[i] = { ...item, body };
                    updateContent({ items });
                  }}
                  multiline
                />
              </ItemCard>
            ))}
          </div>
        );
      }
      case "featured_collection": {
        const content = c as FeaturedCollectionContent;
        return (
          <div className="space-y-6">
            <div className="admin-home-text-block">
              <AdminLocalizedField label={t("homeEyebrow")} value={content.eyebrow} onChange={(v) => setLocalized(["eyebrow"], v)} />
              <AdminLocalizedField label={t("homeTitle")} value={content.title} onChange={(v) => setLocalized(["title"], v)} />
              <AdminLocalizedField label={t("homeTitleItalic")} value={content.titleItalic} onChange={(v) => setLocalized(["titleItalic"], v)} />
              <AdminLocalizedField label={t("homeTitleEnd")} value={content.titleEnd} onChange={(v) => setLocalized(["titleEnd"], v)} />
              <AdminLocalizedField label={t("homeViewAll")} value={content.viewAllLabel} onChange={(v) => setLocalized(["viewAllLabel"], v)} />
              <AdminTextField label={t("homeViewAllLink")} value={content.viewAllHref} onChange={(viewAllHref) => updateContent({ ...content, viewAllHref })} />
            </div>
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{t("homeFeaturedItems")}</p>
              {content.items.map((item, i) => (
                <ItemCard key={i} title={t("homeItemN", { n: i + 1 })} imageUrl={item.image}>
                  {renderImageField(t("homeImage"), item.image, (image) => {
                    const items = [...content.items];
                    items[i] = { ...item, image };
                    updateContent({ ...content, items });
                  }, "portrait")}
                  <AdminTextField
                    label={t("homeLink")}
                    value={item.href}
                    onChange={(href) => {
                      const items = [...content.items];
                      items[i] = { ...item, href };
                      updateContent({ ...content, items });
                    }}
                  />
                  <label className="admin-home-toggle">
                    <input
                      type="checkbox"
                      checked={item.shift}
                      onChange={(e) => {
                        const items = [...content.items];
                        items[i] = { ...item, shift: e.target.checked };
                        updateContent({ ...content, items });
                      }}
                    />
                    <span>{t("homeStaggered")}</span>
                  </label>
                </ItemCard>
              ))}
            </div>
          </div>
        );
      }
      case "articles": {
        const content = c as ArticlesContent;
        return (
          <div className="space-y-6">
            <div className="admin-home-text-block">
              <AdminLocalizedField label={t("homeEyebrow")} value={content.eyebrow} onChange={(v) => setLocalized(["eyebrow"], v)} />
              <AdminLocalizedField label={t("homeTitle")} value={content.title} onChange={(v) => setLocalized(["title"], v)} />
              <AdminLocalizedField label={t("homeReadLabel")} value={content.readLabel} onChange={(v) => setLocalized(["readLabel"], v)} />
            </div>
            <div className="space-y-4">
              {content.items.map((item, i) => (
                <ItemCard key={i} title={t("homeArticleN", { n: i + 1 })} imageUrl={item.image}>
                  {renderImageField(t("homeImage"), item.image, (image) => {
                    const items = [...content.items];
                    items[i] = { ...item, image };
                    updateContent({ ...content, items });
                  }, "wide")}
                  <AdminLocalizedField
                    label={t("homeCategory")}
                    value={item.category}
                    onChange={(category) => {
                      const items = [...content.items];
                      items[i] = { ...item, category };
                      updateContent({ ...content, items });
                    }}
                  />
                  <AdminLocalizedField
                    label={t("homeTitle")}
                    value={item.title}
                    onChange={(title) => {
                      const items = [...content.items];
                      items[i] = { ...item, title };
                      updateContent({ ...content, items });
                    }}
                  />
                  <AdminLocalizedField
                    label={t("homeExcerpt")}
                    value={item.excerpt}
                    onChange={(excerpt) => {
                      const items = [...content.items];
                      items[i] = { ...item, excerpt };
                      updateContent({ ...content, items });
                    }}
                    multiline
                  />
                  <AdminTextField
                    label={t("homeLink")}
                    value={item.href}
                    onChange={(href) => {
                      const items = [...content.items];
                      items[i] = { ...item, href };
                      updateContent({ ...content, items });
                    }}
                  />
                </ItemCard>
              ))}
            </div>
          </div>
        );
      }
      case "campaign": {
        const content = c as CampaignContent;
        return (
          <div className="admin-home-text-block">
            {renderImageField(t("homeImage"), content.image, (image) => updateContent({ ...content, image }), "video")}
            <AdminLocalizedField label={t("homeEyebrow")} value={content.eyebrow} onChange={(v) => setLocalized(["eyebrow"], v)} />
            <AdminLocalizedField label={t("homeTitle")} value={content.title} onChange={(v) => setLocalized(["title"], v)} />
            <AdminLocalizedField label={t("homeTitleItalic")} value={content.titleItalic} onChange={(v) => setLocalized(["titleItalic"], v)} />
            <AdminLocalizedField label={t("homeBody")} value={content.body} onChange={(v) => setLocalized(["body"], v)} multiline />
            <AdminLocalizedField label={t("homeCta")} value={content.ctaLabel} onChange={(v) => setLocalized(["ctaLabel"], v)} />
            <AdminTextField label={t("homeLink")} value={content.href} onChange={(href) => updateContent({ ...content, href })} />
          </div>
        );
      }
      case "category_tiles": {
        const content = c as CategoryTilesContent;
        return (
          <div className="space-y-4">
            {content.tiles.map((tile, i) => (
              <ItemCard key={i} title={t("homeTileN", { n: i + 1 })} imageUrl={tile.image}>
                <label className="admin-field">
                  <span>{t("homeLayout")}</span>
                  <select
                    className="admin-input"
                    value={tile.layout}
                    onChange={(e) => {
                      const tiles = [...content.tiles];
                      tiles[i] = { ...tile, layout: e.target.value as "large" | "small" };
                      updateContent({ tiles });
                    }}
                  >
                    <option value="large">{t("homeLayoutLarge")}</option>
                    <option value="small">{t("homeLayoutSmall")}</option>
                  </select>
                </label>
                {renderImageField(t("homeImage"), tile.image, (image) => {
                  const tiles = [...content.tiles];
                  tiles[i] = { ...tile, image };
                  updateContent({ tiles });
                }, tile.layout === "large" ? "wide" : "portrait")}
                <AdminTextField label={t("homeLink")} value={tile.href} onChange={(href) => {
                  const tiles = [...content.tiles];
                  tiles[i] = { ...tile, href };
                  updateContent({ tiles });
                }} />
                <AdminLocalizedField
                  label={t("homeTitle")}
                  value={tile.title}
                  onChange={(title) => {
                    const tiles = [...content.tiles];
                    tiles[i] = { ...tile, title };
                    updateContent({ tiles });
                  }}
                />
                <AdminLocalizedField
                  label={t("homeLinkLabel")}
                  value={tile.linkLabel}
                  onChange={(linkLabel) => {
                    const tiles = [...content.tiles];
                    tiles[i] = { ...tile, linkLabel };
                    updateContent({ tiles });
                  }}
                />
                <AdminLocalizedField
                  label={t("homeTileSubtitle")}
                  value={tile.subtitle ?? lt("", "", "")}
                  onChange={(subtitle) => {
                    const tiles = [...content.tiles];
                    tiles[i] = { ...tile, subtitle: subtitle.en || subtitle.ar || subtitle.fr ? subtitle : null };
                    updateContent({ tiles });
                  }}
                />
              </ItemCard>
            ))}
          </div>
        );
      }
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h2 className="admin-section-title">{t("navHome")}</h2>
          <p className="admin-section-subtitle">{t("homeSubtitle")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-1">
          {sorted.map((section) => {
            const meta = SECTION_META[section.key];
            const active = activeKey === section.key;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => selectSection(section.key)}
                className={`admin-home-nav-btn ${active ? "admin-home-nav-btn-active" : ""}`}
              >
                <MaterialIcon name={meta.icon} className="!text-xl shrink-0" />
                <span className="flex-1 truncate text-left">{t(meta.labelKey)}</span>
                {!section.enabled ? (
                  <span className="text-[9px] uppercase tracking-wider opacity-70">{t("homeHidden")}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {current ? (
          <form className="admin-home-panel" onSubmit={(e) => void handleSave(e)}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="brand-eyebrow">{t("navHome")}</p>
                <h3 className="font-headline text-2xl text-on-surface">{t(SECTION_META[current.key].labelKey)}</h3>
              </div>
              <label className="admin-home-toggle">
                <input type="checkbox" checked={current.enabled} onChange={(e) => updateEnabled(e.target.checked)} />
                <span>{t("homeVisible")}</span>
              </label>
            </div>

            {error ? <p className="mb-4 text-sm text-error">{error}</p> : null}
            {hasDraft ? (
              <p className="mb-4 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                {t("homeUnsavedHint")}
              </p>
            ) : null}

            {renderEditor()}

            <div className="admin-home-save-bar">
              <button
                type="button"
                disabled={!hasDraft || saving || uploadBusy}
                onClick={() => setDraft(null)}
                className="admin-btn-ghost !flex-none"
              >
                {t("cancel")}
              </button>
              <button type="submit" disabled={saving || uploadBusy || !hasDraft} className="admin-btn-primary">
                {saving ? t("updating") : uploadBusy ? t("copyingToServer") : t("saveChanges")}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
