import { prisma } from "@/lib/prisma";
import { serializeCategory, type CategoryForClient } from "@/lib/category-serialize";
import { toStringArray } from "@/lib/product-serialize";

function categoriesFromProductNames(names: string[]): CategoryForClient[] {
  return names.map((name, index) => ({
    id: name,
    name,
    nameAr: null,
    nameFr: null,
    sortOrder: index,
  }));
}

/** Categories from DB, or derived from product tags if the table/client is not ready yet. */
export async function listCategories(
  fallbackFromProducts?: { categories: unknown }[],
): Promise<CategoryForClient[]> {
  try {
    const rows = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(serializeCategory);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";

    // Table missing — fall back until migration is applied
    if (code === "P2021" || code === "P2022") {
      const names = Array.from(
        new Set(
          (fallbackFromProducts ?? [])
            .flatMap((p) => toStringArray(p.categories))
            .filter(Boolean),
        ),
      ).sort();
      return categoriesFromProductNames(names);
    }

    throw error;
  }
}
