import type { PrismaClient } from "@prisma/client";

/**
 * Production connects through DB_* and previously never ran
 * `prisma migrate deploy`, so `products.deliveryFee` can be missing.
 * Product queries select that column and the shop returns 500 until it exists.
 */
type SqlClient = Pick<PrismaClient, "$queryRaw" | "$executeRawUnsafe">;

let pending: Promise<void> | null = null;

export function ensureProductDeliveryFeeColumn(client: SqlClient): Promise<void> {
  if (!pending) {
    pending = applyDeliveryFeeColumn(client).catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

export async function productDeliveryFeeColumnExists(client: SqlClient): Promise<boolean> {
  const rows = await client.$queryRaw<Array<{ n: bigint | number }>>`
    SELECT COUNT(*) AS n
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
      AND column_name = 'deliveryFee'
  `;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function applyDeliveryFeeColumn(client: SqlClient) {
  if (await productDeliveryFeeColumnExists(client)) return;

  try {
    await client.$executeRawUnsafe(
      "ALTER TABLE `products` ADD COLUMN `deliveryFee` DECIMAL(10, 2) NOT NULL DEFAULT 0",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column|already exists|1060/i.test(message)) throw error;
  }
}
