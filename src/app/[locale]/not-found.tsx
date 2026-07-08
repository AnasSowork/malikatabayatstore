import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("nav");
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-lg font-medium">404</p>
      <Link href="/" className="mt-4 inline-block text-sm underline">
        {t("home")}
      </Link>
    </main>
  );
}
