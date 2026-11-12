export type AppLocale = "fr" | "en";

export type LocalizableProduct = {
  name: string;
  nameAr: string | null;
  nameFr: string | null;
  description: string;
  descriptionAr: string | null;
  descriptionFr: string | null;
};

/** English uses base name/description; French uses *Fr with base fallback. Arabic columns retained in DB only. */
export function getLocalizedProductFields(product: LocalizableProduct, locale: AppLocale) {
  if (locale === "fr") {
    return {
      name: product.nameFr?.trim() || product.name,
      description: product.descriptionFr?.trim() || product.description,
    };
  }
  return { name: product.name, description: product.description };
}
