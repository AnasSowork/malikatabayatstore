export type AppLocale = "en" | "ar" | "fr";

export type LocalizableProduct = {
  name: string;
  nameAr: string | null;
  nameFr: string | null;
  description: string;
  descriptionAr: string | null;
  descriptionFr: string | null;
};

export function getLocalizedProductFields(product: LocalizableProduct, locale: AppLocale) {
  if (locale === "ar") {
    return {
      name: product.nameAr?.trim() || product.name,
      description: product.descriptionAr?.trim() || product.description,
    };
  }
  if (locale === "fr") {
    return {
      name: product.nameFr?.trim() || product.name,
      description: product.descriptionFr?.trim() || product.description,
    };
  }
  return { name: product.name, description: product.description };
}
