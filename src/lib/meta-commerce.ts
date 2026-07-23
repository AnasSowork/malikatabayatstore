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

  return {
    value: Number.isFinite(value) ? value : 0,
    currency: META_CURRENCY,
    content_ids: [input.productId],
    content_type: "product" as const,
    contents: [
      {
        id: input.productId,
        quantity,
        item_price: Number.isFinite(itemPrice) ? itemPrice : 0,
      },
    ],
    num_items: quantity,
  };
}
