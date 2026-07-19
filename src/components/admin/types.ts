import type { OrderLineItem } from "@/lib/bundle-offers";
import type { ProductForClient } from "@/lib/product-serialize";
import {
  createDefaultProductDetailContent,
  type ProductDetailContent,
} from "@/lib/product-detail-content";
import { PRODUCT_SIZES } from "@/lib/product-sizes";

export type OrderWithProduct = {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  selectedColor: string | null;
  quantity: number;
  totalPrice: string;
  lineItems: OrderLineItem[];
  productId: string;
  createdAt: string;
  product: ProductForClient;
};

export type AdminView =
  | "overview"
  | "orders"
  | "products"
  | "categories"
  | "home"
  | "delivery";

export type ColorVariantDraft = {
  id: string;
  name: string;
  hex: string;
  imageUrl: string | null;
};

export type ProductFormState = {
  name: string;
  nameAr: string;
  nameFr: string;
  price: string;
  priceFor2: string;
  priceFor3: string;
  compareAtPrice: string;
  sku: string;
  stockQuantity: string;
  soldCount: string;
  rating: string;
  reviewCount: string;
  description: string;
  descriptionAr: string;
  descriptionFr: string;
  categories: string[];
  imageUrls: string[];
  colorVariants: ColorVariantDraft[];
  availableSizes: string[];
  detailContent: ProductDetailContent;
};

export const PRESET_CATEGORIES = [
  "Abaya",
  "Classic",
  "Embroidered",
  "Open",
  "Kimono",
  "Prayer",
  "New",
  "Occasion",
] as const;

export function createEmptyProductForm(): ProductFormState {
  return {
    name: "",
    nameAr: "",
    nameFr: "",
    price: "",
    priceFor2: "",
    priceFor3: "",
    compareAtPrice: "",
    sku: "",
    stockQuantity: "",
    soldCount: "0",
    rating: "",
    reviewCount: "0",
    description: "",
    descriptionAr: "",
    descriptionFr: "",
    categories: [],
    imageUrls: [],
    colorVariants: [],
    availableSizes: [...PRODUCT_SIZES],
    detailContent: createDefaultProductDetailContent(),
  };
}

export const EMPTY_PRODUCT_FORM: ProductFormState = createEmptyProductForm();
