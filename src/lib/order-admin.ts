import { prisma } from "@/lib/prisma";
import { findBundleOffer, toOrderLineItems, type OrderLineItem } from "@/lib/bundle-offers";
import {
  BASKET_MAX_LINES,
  BASKET_MAX_QUANTITY,
  priceForQuantity,
  roundMoney,
  type BasketLineInput,
} from "@/lib/basket";
import { parseOrderStatus } from "@/lib/order-status";
import { normalizeProductSize } from "@/lib/product-sizes";
import { serializeProduct } from "@/lib/product-serialize";
import { senditShippingProvider } from "@/lib/shipping/providers/sendit";
import { classifySenditCityMatch } from "@/lib/shipping/providers/sendit-cities";
import type { OrderStatus } from "@prisma/client";

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
  productName?: string;
  quantity: number;
  lineItems: OrderLineItem[];
  totalPrice: number;
  selectedColor: string | null;
  status?: OrderStatus;
  statusNote?: string | null | undefined;
  streetAddress?: string | null | undefined;
  shippingComment?: string | null | undefined;
  shippingDescription?: string | null | undefined;
  shippingNoOpen?: boolean;
};

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStreetAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 500);
  return trimmed.length >= 3 ? trimmed : null;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  return undefined;
}

export type ParseOrderError = { error: string; status: number };

export async function parseOrderInput(
  body: Record<string, unknown>,
  options?: {
    allowCustomTotalPrice?: boolean;
    allowAdminFields?: boolean;
    /** Admin update of an order whose catalog product was already deleted. */
    allowDetachedProduct?: boolean;
    /** Admin can still sell a product that is hidden from the shop. */
    allowHiddenProduct?: boolean;
  },
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
    !city.trim()
  ) {
    return { error: "Missing required fields", status: 400 };
  }

  const normalizedPhone = normalizeMoroccanPhone(phone);
  if (!normalizedPhone) {
    return { error: "Invalid Moroccan phone number", status: 400 };
  }

  const basketRequest = readBasketRequest(body);
  if (basketRequest) {
    if ("error" in basketRequest) return basketRequest;
    return parseBasketOrder({
      customerName: customerName.trim(),
      phone: normalizedPhone,
      city: city.trim(),
      items: basketRequest.items,
      rawTotalPrice,
      options,
      body,
    });
  }

  if (typeof productId !== "string" || (!productId.trim() && !options?.allowDetachedProduct)) {
    return { error: "Missing required fields", status: 400 };
  }

  const quantity =
    typeof rawQuantity === "number" && Number.isInteger(rawQuantity) && rawQuantity >= 1
      ? rawQuantity
      : 1;

  const adminFields = options?.allowAdminFields
    ? {
        status: parseOrderStatus(body.status) ?? undefined,
        statusNote: readOptionalString(body.statusNote),
        streetAddress: readOptionalString(body.streetAddress),
        shippingComment: readOptionalString(body.shippingComment),
        shippingDescription: readOptionalString(body.shippingDescription),
        shippingNoOpen: readOptionalBoolean(body.shippingNoOpen),
      }
    : {};

  if (!productId.trim()) {
    const custom =
      typeof rawTotalPrice === "number"
        ? rawTotalPrice
        : typeof rawTotalPrice === "string"
          ? Number(rawTotalPrice)
          : NaN;
    if (!Number.isFinite(custom) || custom < 0) {
      return { error: "Invalid total price", status: 400 };
    }
    const lineItems = toOrderLineItems(rawLineItems);
    return {
      customerName: customerName.trim(),
      phone: normalizedPhone,
      city: city.trim(),
      productId: "",
      quantity,
      lineItems,
      totalPrice: custom,
      selectedColor: lineItems[0]?.color ?? null,
      ...adminFields,
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId.trim() },
  });
  if (!product || (product.hidden && !options?.allowHiddenProduct)) {
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

  const deliveryFee = Number(product.deliveryFee ?? 0);
  let totalPrice = (bundle?.price ?? Number(product.price) * quantity) + deliveryFee;
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
    productName: product.name,
    quantity,
    lineItems,
    totalPrice,
    selectedColor: lineItems[0]?.color ?? null,
    ...adminFields,
  };
}

function readBasketRequest(
  body: Record<string, unknown>,
): { items: BasketLineInput[] } | ParseOrderError | null {
  if (Array.isArray(body.items)) {
    const items = parseBasketItems(body.items);
    if (!items) return { error: "Invalid basket", status: 400 };
    return { items };
  }

  const detailed = toOrderLineItems(body.lineItems);
  if (detailed.length === 0 || detailed.some((item) => !item.productId)) return null;
  return { items: groupPieces(detailed) };
}

function parseBasketItems(value: unknown[]): BasketLineInput[] | null {
  if (value.length === 0 || value.length > BASKET_MAX_LINES) return null;
  const items: BasketLineInput[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    const productId = typeof row.productId === "string" ? row.productId.trim() : "";
    const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
    const size = typeof row.size === "string" ? row.size.trim() : "";
    const color = typeof row.color === "string" && row.color.trim() ? row.color.trim() : null;
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > BASKET_MAX_QUANTITY || !size) {
      return null;
    }
    items.push({ productId, quantity, size, color });
  }
  return mergeBasketItems(items);
}

function groupPieces(items: OrderLineItem[]): BasketLineInput[] {
  const grouped = new Map<string, BasketLineInput>();
  for (const item of items) {
    const productId = item.productId ?? "";
    const key = `${productId}|${item.size}|${item.color ?? ""}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity += 1;
    else grouped.set(key, { productId, quantity: 1, size: item.size, color: item.color });
  }
  return mergeBasketItems([...grouped.values()]);
}

function mergeBasketItems(items: BasketLineInput[]): BasketLineInput[] {
  const grouped = new Map<string, BasketLineInput>();
  for (const item of items) {
    const key = `${item.productId}|${item.size}|${item.color ?? ""}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity += item.quantity;
    else grouped.set(key, { ...item });
  }
  return [...grouped.values()];
}

async function parseBasketOrder(input: {
  customerName: string;
  phone: string;
  city: string;
  items: BasketLineInput[];
  rawTotalPrice: unknown;
  body: Record<string, unknown>;
  options?: {
    allowCustomTotalPrice?: boolean;
    allowAdminFields?: boolean;
    allowHiddenProduct?: boolean;
  };
}): Promise<ParsedOrderInput | ParseOrderError> {
  const items = mergeBasketItems(input.items);
  if (items.length === 0 || items.length > BASKET_MAX_LINES) {
    return { error: "Invalid basket", status: 400 };
  }
  if (items.some((item) => item.quantity < 1 || item.quantity > BASKET_MAX_QUANTITY)) {
    return { error: "Quantity is not available", status: 400 };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(items.map((item) => item.productId))] } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const lineItems: OrderLineItem[] = [];
  let merchandise = 0;
  const deliveryByProduct = new Map<string, number>();
  const requestedByProduct = new Map<string, number>();

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || (product.hidden && !input.options?.allowHiddenProduct)) {
      return { error: "Product not found", status: 400 };
    }
    const serialized = serializeProduct(product);
    const size = normalizeProductSize(item.size);
    if (!serialized.availableSizes.includes(size)) {
      return { error: "Invalid size", status: 400 };
    }
    const variantNames = serialized.colorVariants.map((variant) => variant.name);
    if (variantNames.length > 0 && (!item.color || !variantNames.includes(item.color))) {
      return { error: "Invalid color variant", status: 400 };
    }

    requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
    const stock = serialized.stockQuantity;
    if (stock != null && (requestedByProduct.get(item.productId) ?? 0) > stock) {
      return { error: "Quantity is not available", status: 400 };
    }

    const label = product.nameFr?.trim() || product.name;
    merchandise += priceForQuantity(Number(serialized.price), serialized.bundleOffers, item.quantity);
    if (!deliveryByProduct.has(item.productId)) {
      deliveryByProduct.set(item.productId, Number(serialized.deliveryFee) || 0);
    }
    for (let index = 0; index < item.quantity; index += 1) {
      lineItems.push({
        size,
        color: variantNames.length > 0 ? item.color : null,
        productId: product.id,
        productName: label,
      });
    }
  }

  const delivery = [...deliveryByProduct.values()].reduce((sum, fee) => sum + fee, 0);
  let totalPrice = roundMoney(merchandise + delivery);
  if (input.options?.allowCustomTotalPrice && input.rawTotalPrice != null) {
    const custom =
      typeof input.rawTotalPrice === "number"
        ? input.rawTotalPrice
        : typeof input.rawTotalPrice === "string"
          ? Number(input.rawTotalPrice)
          : NaN;
    if (!Number.isFinite(custom) || custom < 0) {
      return { error: "Invalid total price", status: 400 };
    }
    totalPrice = custom;
  }

  const names = [...new Set(lineItems.map((item) => item.productName).filter(Boolean))];
  const streetAddress = readStreetAddress(input.body.streetAddress);
  if (!streetAddress && !input.options?.allowAdminFields) {
    return { error: "Delivery address is required", status: 400 };
  }

  let city = input.city.trim();
  if (!input.options?.allowAdminFields && senditShippingProvider.isConfigured()) {
    const match = await classifySenditCityMatch(city);
    if (match.kind !== "EXACT_MATCH" && match.kind !== "SAFE_NORMALIZED_MATCH") {
      return { error: "City is outside delivery area", status: 400 };
    }
    // Store the city (ville), not a Sendit quarter — shipping resolves a district later.
    city = match.district.ville.trim() || match.district.name.trim();
  }

  const adminFields = input.options?.allowAdminFields
    ? {
        status: parseOrderStatus(input.body.status) ?? undefined,
        statusNote: readOptionalString(input.body.statusNote),
        shippingComment: readOptionalString(input.body.shippingComment),
        shippingDescription: readOptionalString(input.body.shippingDescription),
        shippingNoOpen: readOptionalBoolean(input.body.shippingNoOpen),
      }
    : {};

  return {
    customerName: input.customerName,
    phone: input.phone,
    city,
    productId: lineItems[0]?.productId ?? items[0]!.productId,
    productName: names.join(" · ").slice(0, 255),
    quantity: lineItems.length,
    lineItems,
    totalPrice,
    selectedColor: lineItems.find((item) => item.color)?.color ?? null,
    streetAddress: streetAddress ?? readOptionalString(input.body.streetAddress) ?? null,
    ...adminFields,
  };
}
