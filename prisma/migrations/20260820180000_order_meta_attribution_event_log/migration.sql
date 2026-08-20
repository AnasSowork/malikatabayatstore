-- AlterTable
ALTER TABLE `orders`
  ADD COLUMN `metaFbp` VARCHAR(255) NULL,
  ADD COLUMN `metaFbc` VARCHAR(512) NULL,
  ADD COLUMN `utmSource` VARCHAR(120) NULL,
  ADD COLUMN `utmMedium` VARCHAR(120) NULL,
  ADD COLUMN `utmCampaign` VARCHAR(180) NULL,
  ADD COLUMN `utmContent` VARCHAR(180) NULL,
  ADD COLUMN `utmTerm` VARCHAR(180) NULL,
  ADD COLUMN `marketingConsent` BOOLEAN NULL;

-- CreateTable
CREATE TABLE `meta_event_logs` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `eventName` VARCHAR(64) NOT NULL,
    `eventId` VARCHAR(128) NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `lastAttemptAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `errorCode` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `meta_event_logs_orderId_eventName_key`(`orderId`, `eventName`),
    INDEX `meta_event_logs_eventId_idx`(`eventId`),
    INDEX `meta_event_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `meta_event_logs`
  ADD CONSTRAINT `meta_event_logs_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
