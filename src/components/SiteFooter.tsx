import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const brand = await getTranslations("brand");

  return (
    <footer className="mt-auto border-t border-brand-black/10 bg-brand-ivory px-6 py-16 md:px-10">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href="/" className="inline-flex">
            <BrandLogo height={52} variant="light" alt={brand("name")} />
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-on-surface-variant">{t("mission")}</p>
        </div>
        <div className="md:col-span-3">
          <h4 className="text-[11px] uppercase tracking-[0.24em] text-on-surface">{t("columnCompany")}</h4>
          <ul className="mt-5 space-y-3 text-sm text-on-surface-variant">
            <li>{t("journal")}</li>
            <li>{t("ethics")}</li>
            <li>
              <Link href="/products" className="hover:text-on-surface">
                {t("shop")}
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-span-4">
          <h4 className="text-[11px] uppercase tracking-[0.24em] text-on-surface">{t("columnConnect")}</h4>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-on-surface-variant">{t("newsletterHint")}</p>
        </div>
      </div>
      <p className="mx-auto mt-14 max-w-[1440px] text-[11px] uppercase tracking-[0.22em] text-on-surface/45">
        {t("copyright")}
      </p>
    </footer>
  );
}
