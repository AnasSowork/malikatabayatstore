import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function bundleOffers(price: number, for2?: number, for3?: number) {
  const offers: { quantity: number; price: number }[] = [{ quantity: 1, price }];
  if (for2) offers.push({ quantity: 2, price: for2 });
  if (for3) offers.push({ quantity: 3, price: for3 });
  return offers;
}

const seedProducts = [
  {
    name: "Nour Classic Abaya",
    nameFr: "Abaya classique Nour",
    nameAr: "عباية نور كلاسيك",
    description:
      "A timeless black abaya in soft crepe with a straight cut and flowing drape. Perfect for everyday wear, work, and errands — modest elegance without compromise.",
    descriptionFr:
      "Abaya noire intemporelle en crêpe doux, coupe droite et tombée fluide. Idéale au quotidien, au travail et en ville — élégance pudique sans compromis.",
    descriptionAr:
      "عباية سوداء كلاسيكية من الكريب الناعم بقصة مستقيمة وانسدال انسيابي. مثالية للارتداء اليومي والعمل — أناقة محتشمة بلا تنازل.",
    price: 449,
    categories: ["Abaya", "Classic"],
    images: [
      "/uploads/p/41253840126134.jpg",
      "/uploads/p/41253839929526.jpg",
      "/uploads/p/41253840093366.jpg",
      "/uploads/p/41253840060598.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Navy", hex: "#1B2838" },
    ],
    bundleOffers: bundleOffers(449, 850, 1200),
  },
  {
    name: "Layla Embroidered Abaya",
    nameFr: "Abaya brodée Layla",
    nameAr: "عباية ليلى المطرزة",
    description:
      "Delicate gold-thread embroidery along the sleeves and hem. A statement abaya for Eid, weddings, and special gatherings — crafted to turn heads with grace.",
    descriptionFr:
      "Broderie délicate fil doré sur les manches et l'ourlet. Une abaya de caractère pour l'Aïd, les mariages et les réceptions — conçue pour séduire avec grâce.",
    descriptionAr:
      "تطريز ذهبي رقيق على الأكمام والحاشية. عباية مميزة للعيد والأعراس والمناسبات — صُنعت لتلفت الأنظار بأناقة.",
    price: 599,
    categories: ["Abaya", "Embroidered", "Occasion"],
    images: [
      "/uploads/p/41254153846966.jpg",
      "/uploads/p/41254154010806.jpg",
      "/uploads/p/41254153978038.jpg",
      "/uploads/p/41254153945270.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Burgundy", hex: "#5C1A2E" },
    ],
    bundleOffers: bundleOffers(599, 1100, 1590),
  },
  {
    name: "Rima Open Abaya",
    nameFr: "Abaya ouverte Rima",
    nameAr: "عباية ريما المفتوحة",
    description:
      "Front-open kimono-style abaya with wide sleeves. Layer over a dress or coordinate set for a modern modest look that moves with you.",
    descriptionFr:
      "Abaya ouverte devant style kimono à manches larges. À porter sur une robe ou un ensemble pour un look modeste moderne et fluide.",
    descriptionAr:
      "عباية مفتوحة من الأمام بأسلوب الكيمونو وأكمام واسعة. تُرتدى فوق فستان أو طقم لإطلالة محتشمة عصرية.",
    price: 529,
    categories: ["Abaya", "Open", "Kimono"],
    images: [
      "/uploads/p/41253704270006.jpg",
      "/uploads/p/41253704237238.jpg",
      "/uploads/p/41253704204470.jpg",
      "/uploads/p/41253704401078.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Taupe", hex: "#8B7D6B" },
    ],
    bundleOffers: bundleOffers(529, 980, 1410),
  },
  {
    name: "Salma Kimono Abaya",
    nameFr: "Abaya kimono Salma",
    nameAr: "عباية سلمى كيمونو",
    description:
      "Lightweight nida fabric with butterfly sleeves and a relaxed silhouette. Ideal for warm days and travel — breathable modesty you can wear all day.",
    descriptionFr:
      "Tissu nida léger, manches papillon et silhouette décontractée. Idéale par temps chaud et en voyage — pudeur respirante pour toute la journée.",
    descriptionAr:
      "قماش نيدا خفيف بأكمام فراشة وقصة مريحة. مثالية للأيام الدافئة والسفر — احتشام مريح طوال اليوم.",
    price: 499,
    categories: ["Abaya", "Kimono", "Open"],
    images: [
      "/uploads/p/41253704368310.jpg",
      "/uploads/p/41253704335542.jpg",
      "/uploads/p/41253704302774.jpg",
      "/uploads/p/41253704171702.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Dusty Rose", hex: "#C4A4A4" },
    ],
    bundleOffers: bundleOffers(499, 930, 1340),
  },
  {
    name: "Hana Prayer Abaya",
    nameFr: "Abaya de prière Hana",
    nameAr: "عباية هناء للصلاة",
    description:
      "Simple, lightweight abaya designed for prayer and home. Easy to slip on, easy to care for — modest coverage when you need it most.",
    descriptionFr:
      "Abaya simple et légère pour la prière et la maison. Facile à enfiler et à entretenir — couverture pudique quand vous en avez besoin.",
    descriptionAr:
      "عباية بسيطة وخفيفة للصلاة والمنزل. سهلة الارتداء والعناية — تغطية محتشمة عندما تحتاجينها.",
    price: 379,
    categories: ["Abaya", "Prayer", "Classic"],
    images: [
      "/uploads/p/41254153912502.jpg",
      "/uploads/p/41254153879734.jpg",
      "/uploads/p/41254153814198.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Grey", hex: "#6B6B6B" },
    ],
    bundleOffers: bundleOffers(379, 700, 1010),
  },
  {
    name: "Amira Linen Abaya",
    nameFr: "Abaya lin Amira",
    nameAr: "عباية أميرة الكتان",
    description:
      "Breathable linen-blend abaya with a clean collar line and hidden snap closure. A refined everyday essential from Malikat Abayat.",
    descriptionFr:
      "Abaya en mélange lin respirant, col épuré et fermeture pression discrète. Un essentiel raffiné du quotidien signé Malikat Abayat.",
    descriptionAr:
      "عباية من مزيج الكتان القابل للتنفس بخط ياقة نظيف وإغلاق مخفي. أساسية يومية راقية من ملكة العبايات.",
    price: 459,
    categories: ["Abaya", "Classic", "New"],
    images: [
      "/uploads/p/41253840027830.jpg",
      "/uploads/p/41253839995062.jpg",
      "/uploads/p/41253839962294.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Olive", hex: "#4A5240" },
    ],
    bundleOffers: bundleOffers(459, 850, 1220),
  },
  {
    name: "Zaynab Occasion Abaya",
    nameFr: "Abaya de soirée Zaynab",
    nameAr: "عباية زينب للمناسبات",
    description:
      "Luxurious satin-finish abaya with subtle shimmer and tailored shoulders. Made for evening events, engagements, and celebrations.",
    descriptionFr:
      "Abaya finition satinée avec reflets subtils et épaules structurées. Conçue pour les soirées, fiançailles et célébrations.",
    descriptionAr:
      "عباية بلمسة ساتان فاخرة بلمعان خفيف وكتفين منسقين. للمناسبات المسائية والخطوبة والاحتفالات.",
    price: 699,
    categories: ["Abaya", "Occasion", "Embroidered"],
    images: [
      "/uploads/p/41254153781430.jpg",
      "/uploads/p/41254153748662.jpg",
      "/uploads/p/41325021593782.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Emerald", hex: "#1B4D3E" },
    ],
    bundleOffers: bundleOffers(699, 1290, 1860),
  },
  {
    name: "Maya Daily Abaya",
    nameFr: "Abaya quotidienne Maya",
    nameAr: "عباية مايا اليومية",
    description:
      "Our best-selling everyday abaya — soft jersey lining, practical pockets, and a length that flatters every frame. Modest comfort, every day.",
    descriptionFr:
      "Notre abaya quotidienne la plus vendue — doublure jersey douce, poches pratiques et longueur flatteuse. Confort pudique, chaque jour.",
    descriptionAr:
      "أكثر عباياتنا مبيعاً لليومي — بطانة جيرسي ناعمة وجيوب عملية وطول يناسب كل القوام. راحة محتشمة كل يوم.",
    price: 399,
    categories: ["Abaya", "Classic", "New"],
    images: [
      "/uploads/p/41253704138934.jpg",
      "/uploads/p/41253704106166.jpg",
      "/uploads/p/41253704073398.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Charcoal", hex: "#36454F" },
    ],
    bundleOffers: bundleOffers(399, 740, 1060),
  },
  {
    name: "Leila Butterfly Abaya",
    nameFr: "Abaya papillon Leila",
    nameAr: "عباية ليلى الفراشة",
    description:
      "Dramatic butterfly sleeves and an open front create movement and elegance. Pair with an inner dress for a layered modest silhouette.",
    descriptionFr:
      "Manches papillon spectaculaires et devant ouvert pour mouvement et élégance. À associer à une robe intérieure pour une silhouette modeste en couches.",
    descriptionAr:
      "أكمام فراشة درامية ومقدمة مفتوحة تمنح حركة وأناقة. تُرتدى مع فستان داخلي لإطلالة محتشمة بطبقات.",
    price: 549,
    categories: ["Abaya", "Open", "New"],
    images: [
      "/uploads/p/41253839896758.jpg",
      "/uploads/p/41253839863990.jpg",
      "/uploads/p/41253839831222.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Mocha", hex: "#6F4E37" },
    ],
    bundleOffers: bundleOffers(549, 1010, 1460),
  },
  {
    name: "Fatima Premium Abaya",
    nameFr: "Abaya premium Fatima",
    nameAr: "عباية فاطمة الفاخرة",
    description:
      "The signature Malikat Abayat piece — hand-finished hems, premium nida, and intricate sleeve embroidery. For the woman who expects nothing less than queenly.",
    descriptionFr:
      "La pièce signature Malikat Abayat — ourlets finis à la main, nida premium et broderie détaillée sur les manches. Pour celle qui n'accepte que la royauté.",
    descriptionAr:
      "قطعة ملكة العبايات المميزة — حواف منتهية يدوياً ونيدا فاخر وتطريز دقيق على الأكمام. للمرأة التي تستحق ملكية العباءة.",
    price: 649,
    categories: ["Abaya", "Embroidered", "Occasion"],
    images: [
      "/uploads/p/de6040c10e97c13901abe1fe16014620.jpg",
      "/uploads/p/41254153846966.jpg",
      "/uploads/p/41253840126134.jpg",
    ],
    colorVariants: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Deep Plum", hex: "#4A1942" },
    ],
    bundleOffers: bundleOffers(649, 1200, 1730),
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@malikatabayat.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "AbdoAbdo123";
  const passwordHash = await hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: { passwordHash },
    create: {
      email: adminEmail.toLowerCase(),
      passwordHash,
    },
  });

  const existingProducts = await prisma.product.count();
  const forceSeed =
    process.env.FORCE_SEED === "1" || process.env.FORCE_SEED === "true";

  if (existingProducts > 0 && !forceSeed) {
    console.log(
      "[seed] Catalog already has products — skipping product seed so orders are not wiped. Set FORCE_SEED=1 to reset catalog.",
    );
    return;
  }

  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  for (const p of seedProducts) {
    await prisma.product.create({ data: p });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
