-- Per-product delivery amount. Existing products stay at 0.
ALTER TABLE `products` ADD COLUMN `deliveryFee` DECIMAL(10, 2) NOT NULL DEFAULT 0;
