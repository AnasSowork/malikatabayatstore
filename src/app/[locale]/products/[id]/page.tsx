import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { getLocalizedProductFields } from "@/lib/product-i18n";
import type { AppLocale } from "@/lib/product-i18n";
import { serializeProduct } from "@/lib/product-serialize";
import { ProductDetailExperience } from "@/components/ProductDetailExperience";
import { ProductCard } from "@/components/ProductCard";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

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
    take: 4,
  });

  const t = await getTranslations("product");
  const serialized = serializeProduct(product);
  const { name, description } = getLocalizedProductFields(serialized, locale as AppLocale);
  const editionCategory = serialized.categories[0] ?? "Essentials";
  const editionLine = `${t("editionPrefix")} 01 / ${editionCategory.toUpperCase()}`;

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-12 md:px-12 md:py-16">
      <ProductDetailExperience
        productId={product.id}
        unitPrice={Number(product.price.toString())}
        images={serialized.images}
        productName={name}
        description={description}
        editionLine={editionLine}
        colorVariants={serialized.colorVariants}
        bundleOffers={serialized.bundleOffers}
      />

      {otherProducts.length > 0 && (
        <section className="mt-20 border-t border-brand-gold/15 pt-16">
          <h2 className="mb-10 font-headline text-2xl text-on-surface md:text-3xl">
            {t("youMayAlsoLike")}
          </h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {otherProducts.map((p) => (
              <ProductCard key={p.id} product={serializeProduct(p)} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
