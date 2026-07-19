-- Add optional merchandising and structured product-page content without
-- changing existing catalog rows.
ALTER TABLE `products`
    ADD COLUMN `sku` VARCHAR(100) NULL,
    ADD COLUMN `compareAtPrice` DECIMAL(10, 2) NULL,
    ADD COLUMN `stockQuantity` INTEGER NULL,
    ADD COLUMN `soldCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `rating` DECIMAL(2, 1) NULL,
    ADD COLUMN `reviewCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `availableSizes` JSON NULL,
    ADD COLUMN `detailContent` JSON NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `products` ALTER COLUMN `updatedAt` DROP DEFAULT;

CREATE UNIQUE INDEX `products_sku_key` ON `products`(`sku`);
