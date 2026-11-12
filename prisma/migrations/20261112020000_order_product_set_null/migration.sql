-- Keep order history when a catalog product is deleted.
ALTER TABLE `orders` ADD COLUMN `productName` VARCHAR(255) NULL;

UPDATE `orders` o
INNER JOIN `products` p ON o.`productId` = p.`id`
SET o.`productName` = p.`name`;

ALTER TABLE `orders` DROP FOREIGN KEY `orders_productId_fkey`;
ALTER TABLE `orders` MODIFY `productId` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD CONSTRAINT `orders_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
