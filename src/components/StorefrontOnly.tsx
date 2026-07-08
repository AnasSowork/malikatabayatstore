"use client";

import { usePathname } from "@/i18n/navigation";

type Props = {
  children: React.ReactNode;
};

export function StorefrontOnly({ children }: Props) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return children;
}
