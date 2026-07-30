export const META_CURRENCY = "MAD";

export type MetaCommerceInput = {
  productId: string;
  value: number;
  quantity: number;
  unitPrice?: number;
};

export function buildMetaCommerceData(input: MetaCommerceInput) {
  const quantity = Math.max(1, input.quantity);
  const value = Number(input.value);
  const itemPrice =
    input.unitPrice != null && Number.isFinite(input.unitPrice)
      ? input.unitPrice
      : value / quantity;

  const normalizedValue = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  const normalizedItemPrice = Number.isFinite(itemPrice) ? Math.round(itemPrice * 100) / 100 : 0;

  return {
    value: normalizedValue,
    currency: META_CURRENCY,
    content_ids: [input.productId],
    content_type: "product" as const,
    contents: [
      {
        id: input.productId,
        quantity,
        item_price: normalizedItemPrice,
      },
    ],
    num_items: quantity,
  };
}
