-- MalikatAbayat Store: run once in phpMyAdmin on empty database u299601727_Malikatabayat
-- Import tab → Choose file → Go

-- === 20260414100000_init ===
-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(255) NULL,
    `nameFr` VARCHAR(255) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` TEXT NOT NULL,
    `descriptionAr` TEXT NULL,
    `descriptionFr` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `orders_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- === 20260414123000_auth_variants_categories ===
-- Add new JSON fields to products
ALTER TABLE `products`
    ADD COLUMN `categories` JSON NULL,
    ADD COLUMN `images` JSON NULL,
    ADD COLUMN `colorVariants` JSON NULL;

-- Backfill old data into new JSON fields
UPDATE `products`
SET
  `categories` = JSON_ARRAY(`category`),
  `images` = JSON_ARRAY(`imageUrl`),
  `colorVariants` = JSON_ARRAY();

-- Make JSON fields required after backfill
ALTER TABLE `products`
    MODIFY `categories` JSON NOT NULL,
    MODIFY `images` JSON NOT NULL,
    MODIFY `colorVariants` JSON NOT NULL;

-- Remove legacy single-value fields
ALTER TABLE `products`
    DROP COLUMN `category`,
    DROP COLUMN `imageUrl`;

-- Admin users table for JWT login
CREATE TABLE `admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- === 20260414131000_order_selected_color ===
ALTER TABLE `orders`
    ADD COLUMN `selectedColor` VARCHAR(191) NULL;

-- === 20260414200000_bundle_offers_line_items ===
-- AlterTable
ALTER TABLE `products` ADD COLUMN `bundleOffers` JSON NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `quantity` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `orders` ADD COLUMN `totalPrice` DECIMAL(10, 2) NULL;
ALTER TABLE `orders` ADD COLUMN `lineItems` JSON NULL;

-- Backfill totalPrice from product base price for existing orders
UPDATE `orders` o
INNER JOIN `products` p ON o.`productId` = p.`id`
SET o.`totalPrice` = p.`price`
WHERE o.`totalPrice` IS NULL;

-- Backfill lineItems from selectedColor for existing single-piece orders
UPDATE `orders`
SET `lineItems` = JSON_ARRAY(JSON_OBJECT('size', '54', 'color', `selectedColor`))
WHERE `lineItems` IS NULL AND `selectedColor` IS NOT NULL;

UPDATE `orders`
SET `lineItems` = JSON_ARRAY(JSON_OBJECT('size', '54', 'color', NULL))
WHERE `lineItems` IS NULL;

ALTER TABLE `orders` MODIFY COLUMN `totalPrice` DECIMAL(10, 2) NOT NULL;

-- === 20260704190000_categories ===
-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `nameAr` VARCHAR(255) NULL,
    `nameFr` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    INDEX `categories_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default categories (matches former preset list)
INSERT INTO `categories` (`id`, `name`, `nameAr`, `nameFr`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
    (REPLACE(UUID(), '-', ''), 'Abaya', 'عباية', 'Abaya', 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (REPLACE(UUID(), '-', ''), 'Classic', 'كلاسيك', 'Classique', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (REPLACE(UUID(), '-', ''), 'Embroidered', 'مطرزة', 'Brodée', 2, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (REPLACE(UUID(), '-', ''), 'Open', 'مفتوحة', 'Ouverte', 3, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (REPLACE(UUID(), '-', ''), 'Kimono', 'كيمونو', 'Kimono', 4, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (REPLACE(UUID(), '-', ''), 'Prayer', 'صلاة', 'Prière', 5, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (REPLACE(UUID(), '-', ''), 'New', 'جديد', 'Nouveau', 6, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (REPLACE(UUID(), '-', ''), 'Occasion', 'مناسبات', 'Occasion', 7, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- === 20260704200000_home_sections ===
-- CreateTable
CREATE TABLE `home_sections` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `content` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `home_sections_key_key`(`key`),
    INDEX `home_sections_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

