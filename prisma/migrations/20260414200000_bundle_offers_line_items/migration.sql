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
