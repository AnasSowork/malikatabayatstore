-- Additive generic shipping fields (Sendit + future providers).
-- Keep olivraisonTrackingId for legacy dual-read / dual-write.

ALTER TABLE `orders` ADD COLUMN `shippingProvider` VARCHAR(32) NULL;
ALTER TABLE `orders` ADD COLUMN `shippingTrackingId` VARCHAR(100) NULL;

CREATE INDEX `orders_shippingTrackingId_idx` ON `orders`(`shippingTrackingId`);
CREATE INDEX `orders_shippingProvider_idx` ON `orders`(`shippingProvider`);
