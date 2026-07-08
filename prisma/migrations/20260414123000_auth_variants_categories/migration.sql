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
