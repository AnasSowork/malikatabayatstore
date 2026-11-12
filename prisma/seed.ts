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
    name: "Nour Classic Dress",
    nameFr: "Robe classique Nour",
    nameAr: "فستان نور الكلاسيكي",
    description:
      "A timeless black piece in soft crepe with a straight cut and flowing drape. Perfect for everyday wear, work, and errands — modern elegance without compromise.",
    descriptionFr:
      "Pièce noire intemporelle en crêpe doux, coupe droite et tombée fluide. Idéale au quotidien, au travail et en ville — élégance moderne sans compromis.",
    descriptionAr:
      "قطعة سوداء كلاسيكية من الكريب الناعم بقصة مستقيمة وانسدال انسيابي. مثالية للارتداء اليومي والعمل — أناقة عصرية بلا تنازل.",
    price: 449,
    categories: ["Essentials", "Classic"],
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
    name: "Layla Embroidered Dress",
    nameFr: "Robe brodée Layla",
    nameAr: "فستان ليلى المطرز",
    description:
      "Delicate gold-thread embroidery along the sleeves and hem. A statement piece for celebrations and special gatherings — crafted to turn heads with grace.",
    descriptionFr:
      "Broderie délicate fil doré sur les manches et l'ourlet. Une pièce de caractère pour les mariages et les réceptions — conçue pour séduire avec grâce.",
    descriptionAr:
      "تطريز ذهبي رقيق على الأكمام والحاشية. قطعة مميزة للأعراس والمناسبات — صُنعت لتلفت الأنظار بأناقة.",
    price: 599,
    categories: ["Essentials", "Embroidered", "Occasion"],
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
    name: "Rima Open Kimono",
    nameFr: "Kimono ouvert Rima",
    nameAr: "كيمونو ريما المفتوح",
    description:
      "Front-open kimono-style piece with wide sleeves. Layer over a dress or coordinate set for a modern, elegant look that moves with you.",
    descriptionFr:
      "Pièce ouverte devant style kimono à manches larges. À porter sur une robe ou un ensemble pour un look moderne et fluide.",
    descriptionAr:
      "قطعة مفتوحة من الأمام بأسلوب الكيمونو وأكمام واسعة. تُرتدى فوق فستان أو طقم لإطلالة عصرية أنيقة.",
    price: 529,
    categories: ["Essentials", "Open", "Kimono"],
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
    name: "Salma Soft Kimono",
    nameFr: "Kimono fluide Salma",
    nameAr: "كيمونو سلمى الناعم",
    description:
      "Lightweight fabric with butterfly sleeves and a relaxed silhouette. Ideal for warm days and travel — breathable comfort you can wear all day.",
    descriptionFr:
      "Tissu léger, manches papillon et silhouette décontractée. Idéale par temps chaud et en voyage — confort respirant pour toute la journée.",
    descriptionAr:
      "قماش خفيف بأكمام فراشة وقصة مريحة. مثالية للأيام الدافئة والسفر — راحة طوال اليوم.",
    price: 499,
    categories: ["Essentials", "Kimono", "Open"],
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
    name: "Hana Everyday Set",
    nameFr: "Ensemble quotidien Hana",
    nameAr: "طقم هناء اليومي",
    description:
      "Simple, lightweight piece designed for home and everyday ease. Easy to slip on, easy to care for — comfort when you need it most.",
    descriptionFr:
      "Pièce simple et légère pour la maison et le quotidien. Facile à enfiler et à entretenir — confort quand vous en avez besoin.",
    descriptionAr:
      "قطعة بسيطة وخفيفة للمنزل واليوميات. سهلة الارتداء والعناية — راحة عندما تحتاجينها.",
    price: 379,
    categories: ["Essentials", "Everyday", "Classic"],
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
    name: "Amira Linen Dress",
    nameFr: "Robe lin Amira",
    nameAr: "فستان أميرة الكتان",
    description:
      "Breathable linen-blend dress with a clean collar line and hidden snap closure. A refined everyday essential from NIRA MODE.",
    descriptionFr:
      "Robe en mélange lin respirant, col épuré et fermeture pression discrète. Un essentiel raffiné du quotidien signé NIRA MODE.",
    descriptionAr:
      "فستان من مزيج الكتان القابل للتنفس بخط ياقة نظيف وإغلاق مخفي. أساسية يومية راقية من NIRA MODE.",
    price: 459,
    categories: ["Essentials", "Classic", "New"],
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
    name: "Zaynab Occasion Dress",
    nameFr: "Robe de soirée Zaynab",
    nameAr: "فستان زينب للمناسبات",
    description:
      "Luxurious satin-finish dress with subtle shimmer and tailored shoulders. Made for evening events, engagements, and celebrations.",
    descriptionFr:
      "Robe finition satinée avec reflets subtils et épaules structurées. Conçue pour les soirées, fiançailles et célébrations.",
    descriptionAr:
      "فستان بلمسة ساتان فاخرة بلمعان خفيف وكتفين منسقين. للمناسبات المسائية والخطوبة والاحتفالات.",
    price: 699,
    categories: ["Essentials", "Occasion", "Embroidered"],
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
    name: "Maya Daily Dress",
    nameFr: "Robe quotidienne Maya",
    nameAr: "فستان مايا اليومي",
    description:
      "Our best-selling everyday dress — soft jersey lining, practical pockets, and a length that flatters every frame. Comfortable elegance, every day.",
    descriptionFr:
      "Notre robe quotidienne la plus vendue — doublure jersey douce, poches pratiques et longueur flatteuse. Élégance confortable, chaque jour.",
    descriptionAr:
      "أكثر فساتيننا مبيعاً لليومي — بطانة جيرسي ناعمة وجيوب عملية وطول يناسب كل القوام. أناقة مريحة كل يوم.",
    price: 399,
    categories: ["Essentials", "Classic", "New"],
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
    name: "Leila Butterfly Kimono",
    nameFr: "Kimono papillon Leila",
    nameAr: "كيمونو ليلى الفراشة",
    description:
      "Dramatic butterfly sleeves and an open front create movement and elegance. Pair with an inner dress for a layered, modern silhouette.",
    descriptionFr:
      "Manches papillon spectaculaires et devant ouvert pour mouvement et élégance. À associer à une robe intérieure pour une silhouette moderne en couches.",
    descriptionAr:
      "أكمام فراشة درامية ومقدمة مفتوحة تمنح حركة وأناقة. تُرتدى مع فستان داخلي لإطلالة عصرية بطبقات.",
    price: 549,
    categories: ["Essentials", "Open", "New"],
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
    name: "Fatima Signature Dress",
    nameFr: "Robe signature Fatima",
    nameAr: "فستان فاطمة المميز",
    description:
      "The signature NIRA MODE piece — hand-finished hems, premium fabric, and intricate sleeve embroidery. For the woman who expects refined, accessible elegance.",
    descriptionFr:
      "La pièce signature NIRA MODE — ourlets finis à la main, tissu premium et broderie détaillée sur les manches. Pour celle qui recherche une élégance raffinée et accessible.",
    descriptionAr:
      "قطعة NIRA MODE المميزة — حواف منتهية يدوياً وقماش فاخر وتطريز دقيق على الأكمام. للمرأة التي تبحث عن أناقة راقية ومتاحة.",
    price: 649,
    categories: ["Essentials", "Embroidered", "Occasion"],
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
  const adminEmail = process.env.ADMIN_EMAIL || "admin@niramode.local";
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
