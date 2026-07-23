import type { AppLocale } from "@/lib/product-i18n";

export type ProductLocalizedText = {
  ar: string;
  fr: string;
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

const text = (ar: string, fr: string): ProductLocalizedText => ({ ar, fr });

export function createDefaultProductDetailContent(): ProductDetailContent {
  return {
    shortDescription: text(
      "أناقة محتشمة وراحة يومية بتفاصيل مصممة بعناية.",
      "Une élégance modeste et confortable, pensée dans les moindres détails.",
    ),
    benefits: [
      {
        icon: "checkroom",
        title: text("قصة أنيقة", "Coupe élégante"),
        body: text("تصميم انسيابي يمنحك إطلالة راقية.", "Une silhouette fluide et raffinée."),
      },
      {
        icon: "air",
        title: text("راحة طوال اليوم", "Confort toute la journée"),
        body: text("قماش مريح وخفيف للاستخدام اليومي.", "Un tissu léger et agréable au quotidien."),
      },
      {
        icon: "styler",
        title: text("سهل التنسيق", "Facile à assortir"),
        body: text("يناسب إطلالات ومناسبات متعددة.", "S’adapte facilement à toutes vos occasions."),
      },
      {
        icon: "verified",
        title: text("جودة ممتازة", "Finition soignée"),
        body: text("خياطة متقنة وتشطيب يدوم.", "Une confection soignée conçue pour durer."),
      },
    ],
    services: [
      {
        icon: "local_shipping",
        title: text("توصيل سريع", "Livraison rapide"),
        body: text("التوصيل إلى جميع مدن المغرب.", "Livraison partout au Maroc."),
      },
      {
        icon: "payments",
        title: text("الدفع عند الاستلام", "Paiement à la livraison"),
        body: text("ادفعي فقط عند وصول طلبك.", "Payez uniquement à la réception."),
      },
      {
        icon: "published_with_changes",
        title: text("استبدال سهل", "Échange facile"),
        body: text("إمكانية استبدال المقاس وفق الشروط.", "Échange de taille selon nos conditions."),
      },
      {
        icon: "workspace_premium",
        title: text("جودة موثوقة", "Qualité contrôlée"),
        body: text("كل قطعة تُراجع قبل الإرسال.", "Chaque pièce est vérifiée avant l’envoi."),
      },
    ],
    accordions: [
      {
        title: text("التفاصيل", "Détails"),
        body: text("أضيفي تفاصيل المنتج والخامة والقصة هنا.", "Ajoutez ici les détails, la matière et la coupe."),
      },
      {
        title: text("التوصيل", "Livraison"),
        body: text("يصل الطلب عادة خلال 24 إلى 48 ساعة.", "La livraison prend généralement 24 à 48 heures."),
      },
      {
        title: text("الاستبدال", "Échange"),
        body: text("يمكن استبدال المقاس إذا بقيت القطعة بحالتها الأصلية.", "La taille peut être échangée si l’article reste intact."),
      },
      {
        title: text("العناية", "Entretien"),
        body: text("غسيل لطيف وتجفيف طبيعي للحفاظ على جودة القطعة.", "Lavage délicat et séchage naturel recommandés."),
      },
    ],
    faqs: [
      {
        question: text("كم يستغرق التوصيل؟", "Quel est le délai de livraison ?"),
        answer: text("تصل معظم الطلبات خلال 24 إلى 48 ساعة.", "La plupart des commandes arrivent sous 24 à 48 heures."),
      },
      {
        question: text("هل الدفع عند الاستلام متاح؟", "Le paiement à la livraison est-il disponible ?"),
        answer: text("نعم، الدفع عند الاستلام متاح في جميع أنحاء المغرب.", "Oui, partout au Maroc."),
      },
      {
        question: text("هل يمكن استبدال المقاس؟", "Puis-je échanger la taille ?"),
        answer: text("نعم، يمكن طلب الاستبدال وفق شروط المتجر.", "Oui, selon les conditions d’échange de la boutique."),
      },
    ],
    trust: {
      eyebrow: text("تسوّقي بثقة", "Achetez en confiance"),
      title: text("قطعة مختارة بعناية", "Une pièce choisie avec soin"),
      body: text(
        "نراجع الجودة والمقاس والتغليف قبل إرسال كل طلب.",
        "Nous vérifions la qualité, la taille et l’emballage avant chaque envoi.",
      ),
      points: [
        text("جودة وفحص قبل الإرسال", "Qualité contrôlée avant l’envoi"),
        text("خدمة عملاء متاحة", "Service client disponible"),
        text("توصيل إلى جميع المدن", "Livraison dans toutes les villes"),
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
  return value[locale]?.trim() || value.ar?.trim() || value.fr?.trim() || "";
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
  return {
    ar: typeof item.ar === "string" ? item.ar.trim() : fallback.ar,
    fr: typeof item.fr === "string" ? item.fr.trim() : fallback.fr,
  };
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
