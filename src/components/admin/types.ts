import type { OrderLineItem } from "@/lib/bundle-offers";
import type { ProductForClient } from "@/lib/product-serialize";

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

export type AdminView = "overview" | "orders" | "products" | "categories" | "home";

export type ColorVariantDraft = {
  id: string;
  name: string;
  hex: string;
};

export type ProductFormState = {
  name: string;
  nameAr: string;
  nameFr: string;
  price: string;
  priceFor2: string;
  priceFor3: string;
  description: string;
  descriptionAr: string;
  descriptionFr: string;
  categories: string[];
  imageUrls: string[];
  colorVariants: ColorVariantDraft[];
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

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "",
  nameAr: "",
  nameFr: "",
  price: "",
  priceFor2: "",
  priceFor3: "",
  description: "",
  descriptionAr: "",
  descriptionFr: "",
  categories: [],
  imageUrls: [],
  colorVariants: [],
};
