import type { AppLocale } from "@/lib/product-i18n";

export type ProductLocalizedText = {
  en: string;
  fr: string;
  /** Legacy Arabic stored in older product JSON; not edited in the active UI. */
  ar?: string;
};

export type ProductInfoItem = {
  icon: string;
  title: ProductLocalizedText;
  body: ProductLocalizedText;
};

export type ProductAccordionItem = {
  title: ProductLocalizedText;
  body: ProductLocalizedText;
};

export type ProductFaqItem = {
  question: ProductLocalizedText;
  answer: ProductLocalizedText;
};

export type ProductPurchaseUi = {
  pieceLabel: ProductLocalizedText;
  selectSizeLabel: ProductLocalizedText;
  colorLabel: ProductLocalizedText;
};

export type ProductDetailContent = {
  shortDescription: ProductLocalizedText;
  benefits: ProductInfoItem[];
  services: ProductInfoItem[];
  accordions: ProductAccordionItem[];
  faqs: ProductFaqItem[];
  trust: {
    eyebrow: ProductLocalizedText;
    title: ProductLocalizedText;
    body: ProductLocalizedText;
    points: ProductLocalizedText[];
  };
  purchaseUi: ProductPurchaseUi;
};

const text = (en: string, fr: string): ProductLocalizedText => ({ en, fr });

export function createDefaultProductDetailContent(): ProductDetailContent {
  return {
    shortDescription: text(
      "Modern elegance and everyday comfort, with carefully designed details.",
      "Une élégance moderne et confortable, pensée dans les moindres détails.",
    ),
    benefits: [
      {
        icon: "checkroom",
        title: text("Elegant cut", "Coupe élégante"),
        body: text("A fluid silhouette for a refined look.", "Une silhouette fluide et raffinée."),
      },
      {
        icon: "air",
        title: text("All-day comfort", "Confort toute la journée"),
        body: text("A light, comfortable fabric for everyday wear.", "Un tissu léger et agréable au quotidien."),
      },
      {
        icon: "styler",
        title: text("Easy to style", "Facile à assortir"),
        body: text("Works for many looks and occasions.", "S’adapte facilement à toutes vos occasions."),
      },
      {
        icon: "verified",
        title: text("Excellent quality", "Finition soignée"),
        body: text("Careful stitching and lasting finishing.", "Une confection soignée conçue pour durer."),
      },
    ],
    services: [
      {
        icon: "local_shipping",
        title: text("Fast delivery", "Livraison rapide"),
        body: text("Delivery to every city in Morocco.", "Livraison partout au Maroc."),
      },
      {
        icon: "payments",
        title: text("Cash on delivery", "Paiement à la livraison"),
        body: text("Pay only when your order arrives.", "Payez uniquement à la réception."),
      },
      {
        icon: "published_with_changes",
        title: text("Easy exchange", "Échange facile"),
        body: text("Size exchange available under our conditions.", "Échange de taille selon nos conditions."),
      },
      {
        icon: "workspace_premium",
        title: text("Trusted quality", "Qualité contrôlée"),
        body: text("Every piece is checked before shipping.", "Chaque pièce est vérifiée avant l’envoi."),
      },
    ],
    accordions: [
      {
        title: text("Details", "Détails"),
        body: text("Add product details, fabric, and cut here.", "Ajoutez ici les détails, la matière et la coupe."),
      },
      {
        title: text("Delivery", "Livraison"),
        body: text("Orders usually arrive within 24 to 48 hours.", "La livraison prend généralement 24 à 48 heures."),
      },
      {
        title: text("Exchange", "Échange"),
        body: text("Size can be exchanged if the piece remains in original condition.", "La taille peut être échangée si l’article reste intact."),
      },
      {
        title: text("Care", "Entretien"),
        body: text("Gentle wash and natural drying to preserve quality.", "Lavage délicat et séchage naturel recommandés."),
      },
    ],
    faqs: [
      {
        question: text("How long does delivery take?", "Quel est le délai de livraison ?"),
        answer: text("Most orders arrive within 24 to 48 hours.", "La plupart des commandes arrivent sous 24 à 48 heures."),
      },
      {
        question: text("Is cash on delivery available?", "Le paiement à la livraison est-il disponible ?"),
        answer: text("Yes, cash on delivery is available across Morocco.", "Oui, partout au Maroc."),
      },
      {
        question: text("Can I exchange the size?", "Puis-je échanger la taille ?"),
        answer: text("Yes, exchanges can be requested under store conditions.", "Oui, selon les conditions d’échange de la boutique."),
      },
    ],
    trust: {
      eyebrow: text("Shop with confidence", "Achetez en confiance"),
      title: text("A carefully chosen piece", "Une pièce choisie avec soin"),
      body: text(
        "نراجع الجودة والمقاس والتغليف قبل إرسال كل طلب.",
        "Nous vérifions la qualité, la taille et l’emballage avant chaque envoi.",
      ),
      points: [
        text("Quality checked before shipping", "Qualité contrôlée avant l’envoi"),
        text("Customer service available", "Service client disponible"),
        text("Delivery to every city", "Livraison dans toutes les villes"),
      ],
    },
    purchaseUi: {
      pieceLabel: text("", ""),
      selectSizeLabel: text("", ""),
      colorLabel: text("", ""),
    },
  };
}

export function localizeProductText(value: ProductLocalizedText, locale: AppLocale): string {
  if (locale === "fr") {
    return value.fr?.trim() || value.en?.trim() || value.ar?.trim() || "";
  }
  return value.en?.trim() || value.fr?.trim() || value.ar?.trim() || "";
}

export function resolvePurchaseLabel(
  custom: ProductLocalizedText,
  locale: AppLocale,
  fallback: string,
  vars?: Record<string, string | number>,
): string {
  let resolved = localizeProductText(custom, locale);
  if (!resolved) resolved = fallback;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      resolved = resolved.replaceAll(`{${key}}`, String(value));
    }
  }
  return resolved;
}

function localized(value: unknown, fallback: ProductLocalizedText): ProductLocalizedText {
  if (!value || typeof value !== "object") return { ...fallback };
  const item = value as Record<string, unknown>;
  const en =
    typeof item.en === "string" && item.en.trim()
      ? item.en.trim()
      : typeof item.ar === "string" && item.ar.trim()
        ? item.ar.trim()
        : fallback.en;
  const fr = typeof item.fr === "string" && item.fr.trim() ? item.fr.trim() : fallback.fr;
  const ar = typeof item.ar === "string" ? item.ar.trim() : fallback.ar;
  return { en, fr, ar };
}

function icon(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[a-z0-9_]{1,40}$/i.test(value.trim())
    ? value.trim()
    : fallback;
}

export function normalizeProductDetailContent(value: unknown): ProductDetailContent {
  const fallback = createDefaultProductDetailContent();
  if (!value || typeof value !== "object") return fallback;
  const source = value as Record<string, unknown>;

  const normalizeInfo = (items: unknown, defaults: ProductInfoItem[]) =>
    (Array.isArray(items) ? items : defaults).slice(0, 6).map((entry, index) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const base = defaults[index] ?? defaults[0]!;
      return {
        icon: icon(item.icon, base.icon),
        title: localized(item.title, base.title),
        body: localized(item.body, base.body),
      };
    });

  const accordions = (Array.isArray(source.accordions) ? source.accordions : fallback.accordions)
    .slice(0, 8)
    .map((entry, index) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const base = fallback.accordions[index] ?? fallback.accordions[0]!;
      return {
        title: localized(item.title, base.title),
        body: localized(item.body, base.body),
      };
    });

  const faqs = (Array.isArray(source.faqs) ? source.faqs : fallback.faqs)
    .slice(0, 10)
    .map((entry, index) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const base = fallback.faqs[index] ?? fallback.faqs[0]!;
      return {
        question: localized(item.question, base.question),
        answer: localized(item.answer, base.answer),
      };
    });

  const trustSource =
    source.trust && typeof source.trust === "object"
      ? (source.trust as Record<string, unknown>)
      : {};
  const trustPoints = (
    Array.isArray(trustSource.points) ? trustSource.points : fallback.trust.points
  )
    .slice(0, 6)
    .map((entry, index) => localized(entry, fallback.trust.points[index] ?? fallback.trust.points[0]!));

  const purchaseSource =
    source.purchaseUi && typeof source.purchaseUi === "object"
      ? (source.purchaseUi as Record<string, unknown>)
      : {};

  return {
    shortDescription: localized(source.shortDescription, fallback.shortDescription),
    benefits: normalizeInfo(source.benefits, fallback.benefits),
    services: normalizeInfo(source.services, fallback.services),
    accordions,
    faqs,
    trust: {
      eyebrow: localized(trustSource.eyebrow, fallback.trust.eyebrow),
      title: localized(trustSource.title, fallback.trust.title),
      body: localized(trustSource.body, fallback.trust.body),
      points: trustPoints,
    },
    purchaseUi: {
      pieceLabel: localized(purchaseSource.pieceLabel, fallback.purchaseUi.pieceLabel),
      selectSizeLabel: localized(purchaseSource.selectSizeLabel, fallback.purchaseUi.selectSizeLabel),
      colorLabel: localized(purchaseSource.colorLabel, fallback.purchaseUi.colorLabel),
    },
  };
}
