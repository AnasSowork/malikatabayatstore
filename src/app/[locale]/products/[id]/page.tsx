import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { getLocalizedProductFields } from "@/lib/product-i18n";
import type { AppLocale } from "@/lib/product-i18n";
import { serializeProduct } from "@/lib/product-serialize";
import { ProductDetailExperience } from "@/components/ProductDetailExperience";
import { ProductCard } from "@/components/ProductCard";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!routing.locales.includes(locale as AppLocale)) return {};
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return {};
  const serialized = serializeProduct(product);
  const { name, description } = getLocalizedProductFields(serialized, locale as AppLocale);
  return {
    title: name,
    description: description.slice(0, 160),
    openGraph: {
      title: name,
      description: description.slice(0, 200),
      images: serialized.images[0] ? [serialized.images[0]] : [],
      type: "website",
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, id } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const otherProducts = await prisma.product.findMany({
    where: { id: { not: id } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const t = await getTranslations("product");
  const serialized = serializeProduct(product);
  const { name, description } = getLocalizedProductFields(serialized, locale as AppLocale);
  const editionCategory = serialized.categories[0] ?? "Essentials";
  const editionLine = `${t("editionPrefix")} 01 / ${editionCategory.toUpperCase()}`;
  const relatedProducts = otherProducts
    .map(serializeProduct)
    .sort((a, b) => {
      const aMatch = a.categories.includes(editionCategory) ? 1 : 0;
      const bMatch = b.categories.includes(editionCategory) ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 4);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: serialized.images,
    sku: serialized.sku ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "MAD",
      price: serialized.price,
      availability:
        serialized.stockQuantity === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
    aggregateRating:
      serialized.rating != null && serialized.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: serialized.rating,
            reviewCount: serialized.reviewCount,
          }
        : undefined,
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-12 md:px-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema).replace(/</g, "\\u003c"),
        }}
      />
      <ProductDetailExperience
        productId={product.id}
        unitPrice={Number(product.price.toString())}
        images={serialized.images}
        productName={name}
        description={description}
        editionLine={editionLine}
        colorVariants={serialized.colorVariants}
        bundleOffers={serialized.bundleOffers}
        category={editionCategory}
        compareAtPrice={
          serialized.compareAtPrice == null ? null : Number(serialized.compareAtPrice)
        }
        sku={serialized.sku}
        stockQuantity={serialized.stockQuantity}
        soldCount={serialized.soldCount}
        rating={serialized.rating}
        reviewCount={serialized.reviewCount}
        availableSizes={serialized.availableSizes}
        detailContent={serialized.detailContent}
      />

      {relatedProducts.length > 0 && (
        <section className="mt-20 border-t border-brand-gold/15 pt-16">
          <h2 className="mb-10 font-headline text-2xl text-on-surface md:text-3xl">
            {t("youMayAlsoLike")}
          </h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
