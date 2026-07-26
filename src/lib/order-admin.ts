import { prisma } from "@/lib/prisma";
import { findBundleOffer, toOrderLineItems, type OrderLineItem } from "@/lib/bundle-offers";
import { normalizeProductSize } from "@/lib/product-sizes";
import { serializeProduct } from "@/lib/product-serialize";

export function normalizeMoroccanPhone(value: string): string | null {
  let normalized = value.replace(/[\s.-]/g, "");
  if (normalized.startsWith("+212")) normalized = `0${normalized.slice(4)}`;
  if (normalized.startsWith("00212")) normalized = `0${normalized.slice(5)}`;
  return /^0[5-7][0-9]{8}$/.test(normalized) ? normalized : null;
}

export type ParsedOrderInput = {
  customerName: string;
  phone: string;
  city: string;
  productId: string;
  quantity: number;
  lineItems: OrderLineItem[];
  totalPrice: number;
  selectedColor: string | null;
};

export type ParseOrderError = { error: string; status: number };

export async function parseOrderInput(
  body: Record<string, unknown>,
  options?: { allowCustomTotalPrice?: boolean },
): Promise<ParsedOrderInput | ParseOrderError> {
  const {
    customerName,
    phone,
    city,
    productId,
    selectedColor,
    quantity: rawQuantity,
    lineItems: rawLineItems,
    totalPrice: rawTotalPrice,
  } = body;

  if (
    typeof customerName !== "string" ||
    !customerName.trim() ||
    typeof phone !== "string" ||
    !phone.trim() ||
    typeof city !== "string" ||
    !city.trim() ||
    typeof productId !== "string" ||
    !productId.trim()
  ) {
    return { error: "Missing required fields", status: 400 };
  }

  const normalizedPhone = normalizeMoroccanPhone(phone);
  if (!normalizedPhone) {
    return { error: "Invalid Moroccan phone number", status: 400 };
  }

  const quantity =
    typeof rawQuantity === "number" && Number.isInteger(rawQuantity) && rawQuantity >= 1
      ? rawQuantity
      : 1;

  const product = await prisma.product.findUnique({
    where: { id: productId.trim() },
  });
  if (!product) {
    return { error: "Product not found", status: 400 };
  }

  const serialized = serializeProduct(product);
  const bundle = findBundleOffer(serialized.bundleOffers, quantity);
  if (!bundle && !options?.allowCustomTotalPrice) {
    return { error: "Invalid bundle quantity", status: 400 };
  }

  const variantNames = serialized.colorVariants.map((v) => v.name);
  const availableSizes = serialized.availableSizes;
  const defaultSize = availableSizes[0] ?? "M";
  let lineItems: OrderLineItem[] = toOrderLineItems(rawLineItems);

  if (lineItems.length === 0 && typeof selectedColor === "string" && selectedColor.trim()) {
    lineItems = [{ size: defaultSize, color: selectedColor.trim() }];
  }

  // If admin sends quantity without full line items, pad with defaults
  if (lineItems.length === 0) {
    lineItems = Array.from({ length: quantity }, () => ({
      size: defaultSize,
      color: variantNames[0] ?? null,
    }));
  }

  if (lineItems.length !== quantity) {
    return { error: "Line items must match selected quantity", status: 400 };
  }

  for (const item of lineItems) {
    const size = normalizeProductSize(item.size);
    item.size = size;
    if (!availableSizes.includes(size)) {
      return { error: "Invalid size", status: 400 };
    }
    if (variantNames.length > 0) {
      if (!item.color || !variantNames.includes(item.color)) {
        return { error: "Invalid color variant", status: 400 };
      }
    }
  }

  let totalPrice = bundle?.price ?? Number(product.price) * quantity;
  if (options?.allowCustomTotalPrice && rawTotalPrice != null) {
    const custom =
      typeof rawTotalPrice === "number"
        ? rawTotalPrice
        : typeof rawTotalPrice === "string"
          ? Number(rawTotalPrice)
          : NaN;
    if (!Number.isFinite(custom) || custom < 0) {
      return { error: "Invalid total price", status: 400 };
    }
    totalPrice = custom;
  }

  return {
    customerName: customerName.trim(),
    phone: normalizedPhone,
    city: city.trim(),
    productId: productId.trim(),
    quantity,
    lineItems,
    totalPrice,
    selectedColor: lineItems[0]?.color ?? null,
  };
}
