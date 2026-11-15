-- Hide a product from the shop without deleting it or its orders.
ALTER TABLE `products` ADD COLUMN `hidden` BOOLEAN NOT NULL DEFAULT false;
