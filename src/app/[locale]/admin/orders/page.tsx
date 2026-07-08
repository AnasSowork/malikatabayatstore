import { AdminDashboard } from "@/components/AdminDashboard";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    redirect({ href: "/admin/login", locale });
  }
  const session = await getAdminSession();
  if (!session) {
    redirect({ href: "/admin/login", locale });
  }

  return <AdminDashboard view="orders" />;
}
