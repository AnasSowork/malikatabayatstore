"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2">
      <span className="hidden font-sans text-[10px] uppercase tracking-[0.22em] text-on-surface/50 sm:inline">
        Lang
      </span>
      <select
        className="store-locale-select cursor-pointer appearance-none border border-brand-black/15 bg-transparent px-3 py-2 pr-8 text-on-surface focus:border-brand-black/40 focus:outline-none"
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        aria-label="Language"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(loc)}
          </option>
        ))}
      </select>
    </label>
  );
}
