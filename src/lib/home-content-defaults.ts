import {
  lt,
  type ArticlesContent,
  type CampaignContent,
  type CategoryTilesContent,
  type FeaturedCollectionContent,
  type HeroContent,
  type HomeSectionKey,
  type ValuePropsContent,
} from "@/lib/home-content-types";

const HERO_IMAGE = "/images/hero/luxury-abaya-hero-banner.png";

const CAMPAIGN_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA5pMfJ3uiVQMngtLc8LkPLTdufhrEY3NdOHlRsFXpDWGSxxoock0swZoWfVZQXqL5dSGYBkzGvizmRZ9zYvfQfRZDZ8CKIFrOoimCzopNeqEIPMWenMzqGxZyt2iGfTO47RQAacMniCglgCzqMSOrjGoF5Tkd5UeIXFqDYY9B9wBMl6yNrHggyN5PybwNuogo40xXcKgA4uT-p29bs8f43SawFZUQ6VQkJ_tMGWfc2RbwyqO1ZUg7uPb1E8Cn8Fnj9HJIGRxyl3FzA";

const CAT_CLASSIC = "/api/uploads/p/de6040c10e97c13901abe1fe16014620.jpg";

const CAT_EMBROIDERED =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuClOOHhYjhgV3bXFXiqw3_bZ-PeAn00G2P3Y1yTtoamqmMdOEKkWVsdGMB54JhuRcTl6g4UVpFhbPy7xnucmo8CQZRXsmFGqCVvlui8PVvp5lhE1IPTM0nToLMLqfmlNdCcQFdQBqtY_-guPQcE_jw24q0tSO2w6IVFiLcjXWzm3JAB6Ui_1zG6Z-7DHULST_n_9iNvE2LwTYIhkHz06bae_-ndxNu_dJW6wMcei-cnINfO23395mnWKuXk-_p5PXxh3KwUWxht-zVk";

const CAT_NEW =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuALU4bwwkc_wU8IT9edK4sqGYBvVYQZO7esYH4umxE6sU5U0TbRHkbWj2tR3YSfqqEOn57-vXYGvUIqq5wzDCrZRrL9P0PozXC8EIp9S81NwHuAhNjAXe8dnysszMM6Nps8k_-xELD_V9Du1aDP2gFG7dANamcsyXmvoyOg0CqpFmPPIG53AWW2bParXL4OrgQKDP4_9aCKXzmLhT0KKaiLtMuxuf2k8R1xqt07eYq7EFMbfhvGWp2QBDuHJkwbMG0iFcO3rb8PjYON";

const FEATURED = [
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBPIXOvXwE1VNkk6n0tAf7Fih35SoFNjnFHZGTnZGbKYi3Z40tAlBulnK02tpPE0y2AMTTq5ywnWCqbrb2DU4rjmI_hfNV63xg4dDKdrvQ6R1V6Xuc9gl0XvsAuWCIoTvJaTo2KRwfY0tn1CaUcAv-Z6jbgd6dPkmLkZnhYnUDtTWA-SSAXGqvY11IBpcf9AxrneHNQHkkdANFdYWqQb7ESzhHh6pqvEQ0qo54aiQDYR_guGuYpORo9ZU5BSY_ybgiFNVJ1mHV1mO6w",
    shift: false,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuByjW-jZXwWwO0CxXw9usojN3-SM3DynCXl1PZvquN3gqHnCz33mA8tWnU8RHTlVMz6zUA_LUlXOODt_x3iOD4KknSV0XtwIVzeQAWlTY89scWf7LhO729P5PYdnX6pN1WTuYFeQswxpXffMWRuS3zRFdQC84S4IH--rP0I-tZ7JkvLUmAKvWxPqhaC0hSrjcs3xyGWNT2gqGYAwTvp5prqS68oZ75OkRW8PkArqTn6cUbIXzvUQAZCbL44jpGtZZclCJUxNhvxvmxv",
    shift: true,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBWBR4AzgOiGWIfwDc9sZPAY4z0yTnx4f24mbqbkAT6T8ATcf8yG8X3TRGQoFXHu3HdS7WKhBh4wtDJtIyd-2FLTpswrAhrefNh0Kh6ctI2xVHp0p20jSM7mSC0HtD9Qdd9wz-MCOoTAD1U2sGrylSwVRlx7FEVv_zcN3Nx6FUhFTv9NmRi8mj2ESWV1lw4ZjExrlbUQ4MVvyqPDk9NqPc7y-4brlSKsLVaZdtYcu16Qs7jmMBHKogIMxLBw_vd7yKrmIWAmX4lyRgF",
    shift: false,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKhIo8z6y7-rXcNbXQTamSriipqRMmO_256STHb_kBueq9i5vBxaeVQL7EuNWxK0X4jLaWxFPujxvTwmkFOaiqnTeAJXVvUBd6oKn05am2RaEJHOckRqvEC_Sb35J2OAh8xDsdDJEL_8JsNTXPySD6RC2I6IRQ0pV1d32aSsdIl3dUHXueqeFvmhmt_uf6A1B5sg4dzynJoOUPnV8ePZRmkmKz7NQipuM5ijOJ4VnXe40jSrLIEn-u-JRphy-C9afC6RCL1GeKkVbm",
    shift: true,
  },
] as const;

export const HOME_SECTION_ORDER: HomeSectionKey[] = [
  "hero",
  "value_props",
  "featured_collection",
  "articles",
  "campaign",
  "category_tiles",
];

export const HOME_SECTION_SORT: Record<HomeSectionKey, number> = {
  hero: 0,
  value_props: 1,
  featured_collection: 2,
  articles: 3,
  campaign: 4,
  category_tiles: 5,
};

export function defaultHeroContent(): HeroContent {
  return {
    image: HERO_IMAGE,
    line1: lt("Queen", "ملكة", "Reine"),
    line2: lt("of Abayas", "العبايات", "des abayas"),
    tagline: lt(
      "Modest elegance for the modern woman. Abayas designed to drape beautifully, every day.",
      "أناقة محتشمة للمرأة العصرية. عبايات تنسدل بجمال في كل يوم.",
      "Élégance pudique pour la femme moderne. Des abayas qui tombent avec grâce, chaque jour.",
    ),
    primaryCta: {
      label: lt("Shop abayas", "تسوق العبايات", "Voir les abayas"),
      href: "/products",
    },
    secondaryCta: {
      label: lt("New arrivals", "وصل حديثاً", "Nouveautés"),
      href: "/products?category=New",
    },
    showScrollHint: true,
    scrollLabel: lt("Scroll", "مرر", "Défiler"),
  };
}

export function defaultValuePropsContent(): ValuePropsContent {
  return {
    items: [
      {
        icon: "local_shipping",
        title: lt("Nationwide delivery", "توصيل لجميع المدن", "Livraison nationale"),
        body: lt(
          "Fast delivery to every city in Morocco",
          "توصيل سريع لكل مدينة في المغرب",
          "Livraison rapide dans toutes les villes du Maroc",
        ),
      },
      {
        icon: "payments",
        title: lt("Cash on delivery", "الدفع عند الاستلام", "Paiement à la livraison"),
        body: lt(
          "Pay only when your abaya arrives",
          "ادفعي فقط عند وصول عبايتك",
          "Payez uniquement à la réception de votre abaya",
        ),
      },
      {
        icon: "diamond",
        title: lt("Queenly quality", "جودة ملكية", "Qualité royale"),
        body: lt(
          "Premium fabrics, finished with care",
          "أقمشة فاخرة بتشطيبات متقنة",
          "Tissus premium, finitions soignées",
        ),
      },
    ],
  };
}

export function defaultFeaturedCollectionContent(): FeaturedCollectionContent {
  return {
    eyebrow: lt("New collection", "مجموعة جديدة", "Nouvelle collection"),
    title: lt("Abayas for every", "عبايات لكل", "Des abayas pour chaque"),
    titleItalic: lt("moment", "لحظة", "instant"),
    titleEnd: lt("of grace.", "من الأناقة.", "de grâce."),
    viewAllLabel: lt("View all abayas", "عرض كل العبايات", "Voir toutes les abayas"),
    viewAllHref: "/products",
    items: FEATURED.map(({ src, shift }) => ({ image: src, href: "/products", shift })),
  };
}

export function defaultArticlesContent(): ArticlesContent {
  return {
    eyebrow: lt("Abaya journal", "مجلة العباية", "Journal abaya"),
    title: lt("Style & care", "أسلوب وعناية", "Style & entretien"),
    readLabel: lt("Read more", "اقرأ المزيد", "Lire"),
    items: [
      {
        category: lt("Fabric", "القماش", "Tissu"),
        title: lt(
          "Choosing the right abaya fabric",
          "كيف تختارين قماش العباية",
          "Choisir le bon tissu d'abaya",
        ),
        excerpt: lt(
          "From breathable crepe to flowing nida, how fabric weight shapes drape, comfort, and season.",
          "من الكريب الخفيف إلى النيدا الانسيابي، كيف يؤثر وزن القماش على الانسدال والراحة والموسم.",
          "Du crêpe respirant au nida fluide, comment le grammage influence la tombée, le confort et la saison.",
        ),
        image: FEATURED[0].src,
        href: "/products",
      },
      {
        category: lt("Fit", "المقاس", "Coupe"),
        title: lt(
          "Length, sleeve & silhouette",
          "الطول والأكمام والقصة",
          "Longueur, manches & silhouette",
        ),
        excerpt: lt(
          "A simple guide to finding an abaya that flatters your frame without compromising modesty.",
          "دليل بسيط لاختيار عباية تناسب قوامك دون التنازل عن الاحتشام.",
          "Un guide simple pour trouver une abaya flatteuse sans compromettre la pudeur.",
        ),
        image: FEATURED[2].src,
        href: "/products",
      },
      {
        category: lt("Care", "العناية", "Entretien"),
        title: lt(
          "Keeping your abaya pristine",
          "الحفاظ على عبايتك أنيقة",
          "Garder son abaya impeccable",
        ),
        excerpt: lt(
          "Washing, steaming, and storing your abaya so it stays elegant wear after wear.",
          "الغسيل والكي والتخزين حتى تبقى عبايتك راقية مع كل ارتداء.",
          "Lavage, repassage et rangement pour une abaya élégante à chaque port.",
        ),
        image: CAMPAIGN_IMG,
        href: "/products",
      },
    ],
  };
}

export function defaultCampaignContent(): CampaignContent {
  return {
    image: CAMPAIGN_IMG,
    eyebrow: lt("The Malikat Abayat promise", "وعد ملكة العبايات", "La promesse Malikat Abayat"),
    title: lt("Crafted", "صُنعت", "Confectionnées"),
    titleItalic: lt("for you", "من أجلك", "pour vous"),
    body: lt(
      "Premium fabrics, modest cuts, and finishing made for Moroccan women who value comfort, coverage, and quiet luxury.",
      "أقمشة فاخرة، قصات محتشمة، وتشطيبات مصممة للمرأة المغربية التي تقدّر الراحة والستر والفخامة الهادئة.",
      "Tissus premium, coupes modestes et finitions pensées pour les femmes marocaines qui recherchent confort, pudeur et luxe discret.",
    ),
    ctaLabel: lt("Explore the collection", "اكتشف المجموعة", "Découvrir la collection"),
    href: "/products",
  };
}

export function defaultCategoryTilesContent(): CategoryTilesContent {
  return {
    tiles: [
      {
        layout: "large",
        image: CAT_CLASSIC,
        href: "/products?category=Classic",
        title: lt("Classic abayas", "عبايات كلاسيك", "Abayas classiques"),
        linkLabel: lt("View classic styles", "عرض الكلاسيك", "Voir le classique"),
        subtitle: null,
      },
      {
        layout: "small",
        image: CAT_EMBROIDERED,
        href: "/products?category=Embroidered",
        title: lt("Embroidered", "مطرزة", "Brodées"),
        linkLabel: lt("Shop embroidered", "تسوق المطرزة", "Voir les brodées"),
        subtitle: null,
      },
      {
        layout: "small",
        image: CAT_NEW,
        href: "/products",
        title: lt("New arrivals", "وصل حديثاً", "Nouveautés"),
        linkLabel: lt("", "", ""),
        subtitle: lt("Fresh styles weekly", "تصاميم جديدة أسبوعياً", "Nouveaux modèles chaque semaine"),
      },
    ],
  };
}

export function defaultHomeSectionContent(key: HomeSectionKey) {
  switch (key) {
    case "hero":
      return defaultHeroContent();
    case "value_props":
      return defaultValuePropsContent();
    case "featured_collection":
      return defaultFeaturedCollectionContent();
    case "articles":
      return defaultArticlesContent();
    case "campaign":
      return defaultCampaignContent();
    case "category_tiles":
      return defaultCategoryTilesContent();
  }
}
