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
