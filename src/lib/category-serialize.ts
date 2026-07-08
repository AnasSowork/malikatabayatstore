import type { Category } from "@prisma/client";
import type { AppLocale } from "@/lib/product-i18n";

export type CategoryForClient = {
  id: string;
  name: string;
  nameAr: string | null;
  nameFr: string | null;
  sortOrder: number;
};

export function serializeCategory(row: Category): CategoryForClient {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.nameAr,
    nameFr: row.nameFr,
    sortOrder: row.sortOrder,
  };
}

export function getLocalizedCategoryLabel(category: CategoryForClient, locale: AppLocale): string {
  if (locale === "ar") return category.nameAr?.trim() || category.name;
  if (locale === "fr") return category.nameFr?.trim() || category.name;
  return category.name;
}
