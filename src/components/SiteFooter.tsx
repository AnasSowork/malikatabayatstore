import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { MaterialIcon } from "@/components/MaterialIcon";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const brand = await getTranslations("brand");

  return (
    <footer className="brand-section-dark mt-auto border-t border-white/15 px-8 py-16 md:px-24">
      <div className="brand-divider mx-auto mb-14 max-w-[1920px] opacity-50" aria-hidden />
      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-12 md:grid-cols-3">
        <div className="md:col-span-1">
          <Link
            href="/"
            className="mb-6 inline-flex"
          >
            <BrandLogo height={56} variant="dark" alt={brand("name")} />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-white/75">{t("mission")}</p>
          <p className="mt-8 font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-white/60">
            {t("copyright")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:col-span-2">
          <div>
            <h4 className="mb-6 font-headline text-xl text-white">{t("columnCompany")}</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <span className="cursor-default transition-colors hover:text-white">
                  {t("journal")}
                </span>
              </li>
              <li>
                <span className="cursor-default transition-colors hover:text-white">
                  {t("ethics")}
                </span>
              </li>
              <li>
                <Link
                  href="/products"
                  className="underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
                >
                  {t("shop")}
                </Link>
              </li>
              <li>
                <Link href="/admin" className="transition-colors hover:text-white">
                  {t("adminLink")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-headline text-xl text-white">{t("columnConnect")}</h4>
            <div className="flex flex-wrap gap-4 text-white/60">
              <MaterialIcon
                name="public"
                className="!text-xl cursor-default transition-colors hover:text-white"
              />
              <MaterialIcon
                name="brand_awareness"
                className="!text-xl cursor-default transition-colors hover:text-white"
              />
              <MaterialIcon
                name="photo_camera"
                className="!text-xl cursor-default transition-colors hover:text-white"
              />
            </div>
            <p className="mt-6 text-sm text-white/60">{t("newsletterHint")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
