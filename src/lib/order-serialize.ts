import { toOrderLineItems } from "@/lib/bundle-offers";
import { createDefaultProductDetailContent } from "@/lib/product-detail-content";
import { serializeProduct, type ProductForClient } from "@/lib/product-serialize";
import {
  serializeMetaEventLog,
  type SerializedMetaEventLog,
} from "@/lib/meta-event-log";
import type { OrderStatus } from "@prisma/client";

/** Order row after its catalog product was removed. */
export function detachedProduct(name: string, id: string): ProductForClient {
  const label = name.trim() || "—";
  return {
    id: id || "removed",
    name: label,
    nameAr: null,
    nameFr: null,
    price: "0",
    compareAtPrice: null,
    deliveryFee: "0",
    sku: null,
    stockQuantity: null,
    soldCount: 0,
    rating: null,
    reviewCount: 0,
    description: "",
    descriptionAr: null,
    descriptionFr: null,
    categories: [],
    images: [],
    colorVariants: [],
    bundleOffers: [],
    availableSizes: [],
    detailContent: createDefaultProductDetailContent(),
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export type SerializedOrder = {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  selectedColor: string | null;
  quantity: number;
  totalPrice: string;
  lineItems: ReturnType<typeof toOrderLineItems>;
  productId: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  statusNote: string | null;
  statusUpdatedAt: string | null;
  streetAddress: string | null;
  shippingComment: string | null;
  shippingDescription: string | null;
  shippingNoOpen: boolean;
  shippingProvider: string | null;
  shippingTrackingId: string | null;
  shippedAt: string | null;
  product: ReturnType<typeof serializeProduct>;
  metaEventLogs?: SerializedMetaEventLog[];
};

export function serializeOrder(order: {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  selectedColor: string | null;
  quantity: number;
  totalPrice: { toString(): string };
  lineItems: unknown;
  productId: string | null;
  productName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: OrderStatus;
  statusNote: string | null;
  statusUpdatedAt: Date | null;
  streetAddress: string | null;
  shippingComment: string | null;
  shippingDescription: string | null;
  shippingNoOpen: boolean;
  shippingProvider?: string | null;
  shippingTrackingId?: string | null;
  shippedAt: Date | null;
  product: Parameters<typeof serializeProduct>[0] | null;
  metaEventLogs?: Parameters<typeof serializeMetaEventLog>[0][];
}): SerializedOrder {
  return {
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    city: order.city,
    selectedColor: order.selectedColor,
    quantity: order.quantity,
    totalPrice: order.totalPrice.toString(),
    lineItems: toOrderLineItems(order.lineItems),
    productId: order.productId ?? "",
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    status: order.status,
    statusNote: order.statusNote,
    statusUpdatedAt: order.statusUpdatedAt?.toISOString() ?? null,
    streetAddress: order.streetAddress,
    shippingComment: order.shippingComment,
    shippingDescription: order.shippingDescription,
    shippingNoOpen: order.shippingNoOpen,
    shippingProvider: order.shippingProvider ?? null,
    shippingTrackingId: order.shippingTrackingId ?? null,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    product: order.product
      ? serializeProduct(order.product)
      : detachedProduct(order.productName ?? "", order.productId ?? ""),
    ...(order.metaEventLogs
      ? { metaEventLogs: order.metaEventLogs.map(serializeMetaEventLog) }
      : {}),
  };
}
