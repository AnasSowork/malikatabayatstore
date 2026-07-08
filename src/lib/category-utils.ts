import { prisma } from "@/lib/prisma";
import { toStringArray } from "@/lib/product-serialize";

export async function countProductsWithCategory(name: string): Promise<number> {
  const products = await prisma.product.findMany({ select: { categories: true } });
  return products.filter((p) => toStringArray(p.categories).includes(name)).length;
}

export async function renameCategoryInProducts(oldName: string, newName: string): Promise<void> {
  if (oldName === newName) return;

  const products = await prisma.product.findMany({ select: { id: true, categories: true } });
  await Promise.all(
    products.map((p) => {
      const cats = toStringArray(p.categories);
      if (!cats.includes(oldName)) return Promise.resolve();
      const updated = cats.map((c) => (c === oldName ? newName : c));
      return prisma.product.update({
        where: { id: p.id },
        data: { categories: updated },
      });
    }),
  );
}
