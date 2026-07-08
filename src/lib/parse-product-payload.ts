import { normalizeProductImageSrc } from "@/lib/normalize-product-image-src";
import { buildBundleOffersFromPrices, toBundleOffers, type BundleOffer } from "@/lib/bundle-offers";

export type ColorVariantInput = { name: string; hex?: string };

export type ParsedProductPayload = {
  name: string;
  nameAr: string | null;
  nameFr: string | null;
  price: number;
  description: string;
  descriptionAr: string | null;
  descriptionFr: string | null;
  categoryList: string[];
  imageList: string[];
  colorList: { name: string; hex: string | null }[];
  bundleOffers: BundleOffer[];
};

export function parseProductPayload(body: Record<string, unknown>):
  | { ok: true; data: ParsedProductPayload }
  | { ok: false; error: string } {
  const {
    name,
    nameAr,
    nameFr,
    price,
    priceFor2,
    priceFor3,
    description,
    descriptionAr,
    descriptionFr,
    categories,
    images,
    colorVariants,
    bundleOffers,
  } = body;

  const categoryList = Array.isArray(categories)
    ? categories.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const imageList = Array.isArray(images)
    ? images
        .filter((v): v is string => typeof v === "string")
        .map((s) => normalizeProductImageSrc(s))
        .filter((s) => s.length > 0)
    : [];
  const colorList = Array.isArray(colorVariants)
    ? colorVariants.filter(
        (v): v is ColorVariantInput =>
          Boolean(
            v &&
              typeof v === "object" &&
              "name" in v &&
              typeof (v as { name?: unknown }).name === "string" &&
              (v as { name: string }).name.trim(),
          ),
      )
    : [];

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof price === "undefined" ||
    typeof description !== "string" ||
    categoryList.length === 0 ||
    imageList.length === 0
  ) {
    return { ok: false, error: "Missing required fields" };
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return { ok: false, error: "Invalid price" };
  }

  let offers: BundleOffer[];
  if (Array.isArray(bundleOffers) && bundleOffers.length > 0) {
    offers = toBundleOffers(bundleOffers, priceNum);
  } else {
    const p2 =
      priceFor2 === undefined || priceFor2 === null || priceFor2 === ""
        ? null
        : Number(priceFor2);
    const p3 =
      priceFor3 === undefined || priceFor3 === null || priceFor3 === ""
        ? null
        : Number(priceFor3);
    if (p2 != null && (!Number.isFinite(p2) || p2 < 0)) {
      return { ok: false, error: "Invalid bundle price for 2" };
    }
    if (p3 != null && (!Number.isFinite(p3) || p3 < 0)) {
      return { ok: false, error: "Invalid bundle price for 3" };
    }
    offers = buildBundleOffersFromPrices(priceNum, p2, p3);
  }

  return {
    ok: true,
    data: {
      name: name.trim(),
      nameAr: typeof nameAr === "string" && nameAr.trim() ? nameAr.trim() : null,
      nameFr: typeof nameFr === "string" && nameFr.trim() ? nameFr.trim() : null,
      price: priceNum,
      description: description.trim(),
      descriptionAr:
        typeof descriptionAr === "string" && descriptionAr.trim() ? descriptionAr.trim() : null,
      descriptionFr:
        typeof descriptionFr === "string" && descriptionFr.trim() ? descriptionFr.trim() : null,
      categoryList,
      imageList,
      colorList: colorList.map((v) => ({
        name: v.name.trim(),
        hex: typeof v.hex === "string" && v.hex.trim() ? v.hex.trim() : null,
      })),
      bundleOffers: offers,
    },
  };
}
