import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/product-serialize";
import { listCategories } from "@/lib/list-categories";
import { ProductCard } from "@/components/ProductCard";
import { ProductsToolbar } from "@/components/ProductsToolbar";
import { NewsletterSection } from "@/components/NewsletterSection";
import { routing } from "@/i18n/routing";

type SearchParams = { category?: string; sort?: string };

export const runtime = "nodejs";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations("products");
  const sp = await searchParams;
  const category = sp.category?.trim() || undefined;
  const sort = sp.sort || "new";

  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
        ? { price: "desc" as const }
        : { createdAt: "desc" as const };

  const rows = await prisma.product.findMany({
    orderBy,
  });
  const products = rows
    .map(serializeProduct)
    .filter((p) => (category ? p.categories.includes(category) : true));

  const categories = await listCategories(rows);

  const now = Date.now();
  const isNewThreshold = 14 * 24 * 60 * 60 * 1000;

  return (
    <div className="bg-surface">
      <main className="mx-auto max-w-[1920px] px-6 py-12 md:px-8 md:py-16">
        <section className="mb-12 md:mb-16">
          <span className="brand-eyebrow mb-3 block">Malikat Abayat</span>
          <h1 className="font-headline text-5xl tracking-tight text-on-surface md:text-7xl md:leading-[1.05]">
            {t("title")}{" "}
            <span className="italic brand-gold-text">{t("titleItalic")}</span>
          </h1>
          <p className="font-store mt-4 max-w-lg text-base leading-relaxed text-on-surface/70 md:text-lg">
            {t("intro")}
          </p>
          <div className="brand-divider mt-8 max-w-sm opacity-70" aria-hidden />
        </section>

        <Suspense fallback={<div className="mb-12 h-14 animate-pulse rounded-full bg-surface-container-low" />}>
          <ProductsToolbar categories={categories} />
        </Suspense>

        {products.length === 0 ? (
          <p className="py-16 text-center text-sm text-on-surface-variant">{t("empty")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => {
              const created = new Date(product.createdAt).getTime();
              const isNew = now - created < isNewThreshold;
              return (
                <li key={product.id} className="reveal-up">
                  <ProductCard product={product} isNew={isNew} />
                </li>
              );
            })}
          </ul>
        )}

        <NewsletterSection />
      </main>
    </div>
  );
}
