"use client";

import { usePathname } from "@/i18n/navigation";

type Props = {
  children: React.ReactNode;
};

export function StorefrontMain({ children }: Props) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  return <div className={`flex-1 ${!isAdmin ? "pb-24 md:pb-0" : ""}`}>{children}</div>;
}
