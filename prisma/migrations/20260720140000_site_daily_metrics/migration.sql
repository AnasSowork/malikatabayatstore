-- CreateTable
CREATE TABLE `site_daily_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `day` DATE NOT NULL,
    `pathType` VARCHAR(32) NOT NULL,
    `productId` VARCHAR(64) NOT NULL DEFAULT '',
    `views` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `site_daily_metrics_day_idx`(`day`),
    UNIQUE INDEX `site_daily_metrics_day_pathType_productId_key`(`day`, `pathType`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
