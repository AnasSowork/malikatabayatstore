-- Copy legacy tracking into Sendit fields, then drop the legacy column.
UPDATE `orders`
SET
  `shippingProvider` = COALESCE(NULLIF(`shippingProvider`, ''), 'sendit'),
  `shippingTrackingId` = COALESCE(NULLIF(`shippingTrackingId`, ''), `olivraisonTrackingId`),
  `status` = CASE WHEN `status` = 'CONFIRMED' AND `olivraisonTrackingId` IS NOT NULL AND TRIM(`olivraisonTrackingId`) <> '' THEN 'SHIPPED' ELSE `status` END
WHERE `olivraisonTrackingId` IS NOT NULL AND TRIM(`olivraisonTrackingId`) <> '';

ALTER TABLE `orders` DROP COLUMN `olivraisonTrackingId`;
