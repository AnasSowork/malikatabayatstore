import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

/**
 * Production connects through DB_* and previously never ran
 * `prisma migrate deploy`, so `products.deliveryFee` can be missing.
 * Product queries select that column and the shop returns 500 until it exists.
 *
 * The same gap left `orders.productName` missing and `productId` required.
 * Order queries and product deletion then return 500. Repair both in place.
 */
type SqlClient = Pick<PrismaClient, "$queryRaw" | "$executeRawUnsafe">;

const ORDER_MIGRATION = "20261112020000_order_product_set_null";

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
    if (!isBenignSql(error, /duplicate column|already exists|1060/i)) throw error;
  }
}

type OrderProductState = {
  ready: boolean;
  hasName: boolean;
  nullable: boolean;
  columnType: string;
  charset: string | null;
  collation: string | null;
  foreignKeys: Array<{ name: string; deleteRule: string }>;
};

let orderPending: Promise<void> | null = null;

export function ensureOrderProductSnapshot(client: SqlClient): Promise<void> {
  if (!orderPending) {
    orderPending = applyOrderProductSnapshot(client).catch((error) => {
      orderPending = null;
      throw error;
    });
  }
  return orderPending;
}

export async function orderProductSnapshotReady(client: SqlClient): Promise<boolean> {
  return (await readOrderProductState(client)).ready;
}

async function applyOrderProductSnapshot(client: SqlClient) {
  const state = await readOrderProductState(client);
  if (state.ready) {
    await rememberOrderMigration(client);
    return;
  }

  logSchema("info", "repairing orders so a product can be deleted without losing its orders");

  if (!state.hasName) {
    await exec(
      client,
      "ALTER TABLE `orders` ADD COLUMN `productName` VARCHAR(255) NULL",
      /duplicate column|already exists|1060/i,
    );
  }

  await client.$executeRawUnsafe(
    "UPDATE `orders` o INNER JOIN `products` p ON o.`productId` = p.`id` SET o.`productName` = p.`name` WHERE o.`productName` IS NULL",
  );

  for (const foreignKey of state.foreignKeys) {
    const name = safeIdent(foreignKey.name);
    if (!name) throw new Error("Refusing to change an unexpected orders foreign key");
    await exec(
      client,
      `ALTER TABLE \`orders\` DROP FOREIGN KEY \`${name}\``,
      /1091|check that column\/key exists|does not exist|can't drop/i,
    );
  }

  if (!state.nullable) {
    await client.$executeRawUnsafe(
      `ALTER TABLE \`orders\` MODIFY \`productId\` ${sqlColumnType(state)} NULL`,
    );
  }

  await exec(
    client,
    "ALTER TABLE `orders` ADD CONSTRAINT `orders_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
    /1826|duplicate foreign key|already exists|1061/i,
  );

  const repaired = await readOrderProductState(client);
  if (!repaired.ready) {
    throw new Error("orders product snapshot is still incomplete after repair");
  }
  await rememberOrderMigration(client);
  logSchema("info", "orders product snapshot is ready");
}

async function readOrderProductState(client: SqlClient): Promise<OrderProductState> {
  const columns = await client.$queryRaw<
    Array<{
      name: string;
      nullable: string;
      columnType: string;
      charset: string | null;
      collation: string | null;
    }>
  >`
    SELECT COLUMN_NAME AS name,
           IS_NULLABLE AS nullable,
           COLUMN_TYPE AS columnType,
           CHARACTER_SET_NAME AS charset,
           COLLATION_NAME AS collation
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME IN ('productId', 'productName')
  `;
  const productId = columns.find((column) => column.name === "productId");
  if (!productId) throw new Error("orders.productId is missing");

  const foreignKeys = await client.$queryRaw<Array<{ name: string; deleteRule: string }>>`
    SELECT rc.CONSTRAINT_NAME AS name, rc.DELETE_RULE AS deleteRule
    FROM information_schema.KEY_COLUMN_USAGE kcu
    JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
      ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
     AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.TABLE_NAME = 'orders'
      AND kcu.COLUMN_NAME = 'productId'
      AND kcu.REFERENCED_TABLE_NAME = 'products'
  `;

  const hasName = columns.some((column) => column.name === "productName");
  const nullable = productId.nullable === "YES";
  const setNull = foreignKeys.some((key) => key.deleteRule === "SET NULL");
  return {
    ready: hasName && nullable && setNull,
    hasName,
    nullable,
    columnType: productId.columnType,
    charset: productId.charset,
    collation: productId.collation,
    foreignKeys,
  };
}

function sqlColumnType(state: OrderProductState): string {
  const columnType = state.columnType.trim().toLowerCase();
  if (!/^varchar\(\d+\)$/.test(columnType)) {
    throw new Error("Refusing to change orders.productId because its type is unexpected");
  }
  const charset = safeIdent(state.charset ?? "");
  const collation = safeIdent(state.collation ?? "");
  if (!charset || !collation) return columnType;
  return `${columnType} CHARACTER SET ${charset} COLLATE ${collation}`;
}

async function rememberOrderMigration(client: SqlClient) {
  const checksum = orderMigrationChecksum();
  if (!checksum) return;

  try {
    const rows = await client.$queryRaw<Array<{ finished: Date | null }>>`
      SELECT finished_at AS finished
      FROM _prisma_migrations
      WHERE migration_name = ${ORDER_MIGRATION}
      LIMIT 5
    `;
    if (rows.some((row) => row.finished)) return;

    if (rows.length > 0) {
      await client.$executeRawUnsafe(
        `UPDATE \`_prisma_migrations\`
         SET checksum = '${checksum}',
             finished_at = NOW(3),
             rolled_back_at = NULL,
             logs = NULL,
             applied_steps_count = 1
         WHERE migration_name = '${ORDER_MIGRATION}'
           AND finished_at IS NULL`,
      );
      return;
    }

    const id = randomUUID();
    await client.$executeRawUnsafe(
      `INSERT INTO \`_prisma_migrations\`
         (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES
         ('${id}', '${checksum}', NOW(3), '${ORDER_MIGRATION}', NULL, NULL, NOW(3), 1)`,
    );
  } catch (error) {
    logSchema(
      "warn",
      `could not record ${ORDER_MIGRATION}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function orderMigrationChecksum(): string | null {
  try {
    const file = path.join(
      process.cwd(),
      "prisma/migrations",
      ORDER_MIGRATION,
      "migration.sql",
    );
    return createHash("sha256").update(readFileSync(file)).digest("hex");
  } catch {
    return null;
  }
}

function safeIdent(value: string): string | null {
  return /^[A-Za-z0-9_]+$/.test(value) ? value : null;
}

async function exec(client: SqlClient, sql: string, ignore: RegExp) {
  try {
    await client.$executeRawUnsafe(sql);
  } catch (error) {
    if (!isBenignSql(error, ignore)) throw error;
  }
}

function isBenignSql(error: unknown, pattern: RegExp): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return pattern.test(message);
}

function logSchema(level: string, message: string) {
  const safe = message.replace(/mysql:\/\/[^@\s]+@/g, "mysql://***@");
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message: safe.slice(0, 1500),
    }),
  );
}
