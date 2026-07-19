"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { BrandButton } from "@/components/BrandButton";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/product-i18n";
import { formatMad } from "@/lib/format-price";
import type { OrderLineItem } from "@/lib/bundle-offers";

type Props = {
  productId: string;
  quantity: number;
  totalPrice: number;
  lineItems: OrderLineItem[];
  requiresColorSelection: boolean;
  canSubmit: boolean;
  locale: AppLocale;
};

const inputClass =
  "h-[3.25rem] w-full rounded-xl border border-black/30 bg-white px-4 font-store text-base font-medium text-on-surface placeholder:text-outline transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black/10";

const labelClass = "px-1 font-store text-xs font-semibold text-on-surface-variant";

export function OrderForm({
  productId,
  quantity,
  totalPrice,
  lineItems,
  requiresColorSelection,
  canSubmit,
  locale,
}: Props) {
  const t = useTranslations("product");
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          city,
          productId,
          quantity,
          lineItems,
          selectedColor: lineItems[0]?.color ?? null,
        }),
      });
      if (!res.ok) throw new Error("order failed");
      setStatus("success");
      setCustomerName("");
      setPhone("");
      setCity("");
      router.push("/thank-you");
    } catch {
      setStatus("error");
    }
  }

  const disabled =
    status === "loading" || !canSubmit || (requiresColorSelection && lineItems.some((i) => !i.color));

  return (
    <div id="order-form" className="space-y-5 scroll-mt-24 rounded-2xl border border-black/15 bg-white p-4 md:p-6">
      <div className="space-y-1">
        <h3 className="font-store text-lg font-semibold text-on-surface">{t("orderTitle")}</h3>
        <p className="brand-eyebrow">{t("orderSubtitle")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClass}>{t("customerName")}</label>
            <input
              required
              className={inputClass}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
              placeholder={t("customerNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>{t("phone")}</label>
            <input
              required
              type="tel"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder={t("phonePlaceholder")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>{t("city")}</label>
          <input
            required
            className={inputClass}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            placeholder={t("cityPlaceholder")}
          />
        </div>

        {!canSubmit ? (
          <p className="text-center text-sm text-on-surface-variant">{t("completeSelections")}</p>
        ) : null}

        <div className="space-y-2 border-t border-black/10 pt-4">
          <div className="flex items-center justify-between font-store text-xs text-on-surface-variant">
            <span>{t("delivery")}</span>
            <strong className="text-on-surface">{t("freeDelivery")}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-store text-xs font-semibold text-on-surface-variant">
              {quantity > 1 ? t("bundleTotal", { count: quantity }) : t("total")}
            </span>
            <span className="font-headline text-xl font-bold text-on-surface">{formatMad(totalPrice, locale)}</span>
          </div>
        </div>

        <BrandButton type="submit" variant="primary" disabled={disabled} className="btn-brand-block">
          {status === "loading" ? t("submitting") : t("submit")}
        </BrandButton>
        {status === "success" && (
          <p className="text-center text-sm brand-gold-text">{t("success")}</p>
        )}
        {status === "error" && <p className="text-center text-sm text-error">{t("error")}</p>}
      </form>
      <div className="flex flex-wrap items-center justify-center gap-6 border-t border-brand-gold/15 pt-6 font-sans text-[10px] uppercase tracking-widest text-on-surface-variant">
        <span className="flex items-center gap-2 brand-gold-text">
          <MaterialIcon name="local_shipping" className="!text-lg" />
          {t("trustShipping")}
        </span>
        <span className="flex items-center gap-2 brand-gold-text">
          <MaterialIcon name="verified" className="!text-lg" />
          {t("trustAuthentic")}
        </span>
      </div>
    </div>
  );
}
