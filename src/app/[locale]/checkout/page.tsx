import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CheckoutPage } from "@/components/CheckoutPage";
import { routing } from "@/i18n/routing";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);
  return <CheckoutPage />;
}
