import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist_Mono, Inter, Newsreader, Cairo } from "next/font/google";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { StorefrontMain } from "@/components/StorefrontMain";
import { StorefrontOnly } from "@/components/StorefrontOnly";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const runtime = "nodejs";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : routing.defaultLocale;
  const messages = (await import(`../../../messages/${safeLocale}.json`)).default as {
    meta: { title: string; description: string };
  };
  return {
    title: messages.meta.title,
    description: messages.meta.description,
    icons: {
      icon: "/logo.png",
      apple: "/logo.png",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const fontVars = `${inter.variable} ${newsreader.variable} ${cairo.variable} ${geistMono.variable}`;

  return (
    <html lang={locale} dir={dir} className={`h-full ${fontVars} antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col bg-surface font-sans text-on-surface">
        <NextIntlClientProvider messages={messages}>
          <SiteHeader />
          <StorefrontMain>{children}</StorefrontMain>
          <StorefrontOnly>
            <SiteFooter />
            <MobileBottomNav />
          </StorefrontOnly>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
