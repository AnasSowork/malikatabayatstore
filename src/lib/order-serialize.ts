import { toOrderLineItems } from "@/lib/bundle-offers";
import { serializeProduct } from "@/lib/product-serialize";
import type { OrderStatus } from "@prisma/client";

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
  olivraisonTrackingId: string | null;
  shippedAt: string | null;
  product: ReturnType<typeof serializeProduct>;
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
  productId: string;
  createdAt: Date;
  updatedAt: Date;
  status: OrderStatus;
  statusNote: string | null;
  statusUpdatedAt: Date | null;
  streetAddress: string | null;
  shippingComment: string | null;
  shippingDescription: string | null;
  shippingNoOpen: boolean;
  olivraisonTrackingId: string | null;
  shippedAt: Date | null;
  product: Parameters<typeof serializeProduct>[0];
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
    productId: order.productId,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    status: order.status,
    statusNote: order.statusNote,
    statusUpdatedAt: order.statusUpdatedAt?.toISOString() ?? null,
    streetAddress: order.streetAddress,
    shippingComment: order.shippingComment,
    shippingDescription: order.shippingDescription,
    shippingNoOpen: order.shippingNoOpen,
    olivraisonTrackingId: order.olivraisonTrackingId,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    product: serializeProduct(order.product),
  };
}
