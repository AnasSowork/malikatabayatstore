import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "fr"],
  defaultLocale: "ar",
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
