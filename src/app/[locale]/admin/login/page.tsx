import { notFound } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  const session = await getAdminSession();
  if (session) {
    redirect({ href: "/admin", locale });
  }

  return (
    <main>
      <AdminLoginForm />
    </main>
  );
}
