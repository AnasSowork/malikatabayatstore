"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BrandButton } from "@/components/BrandButton";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/product-i18n";
import { MadPrice } from "@/components/MadPrice";
import type { OrderLineItem } from "@/lib/bundle-offers";
import { trackInitiateCheckout, savePendingPurchase } from "@/lib/meta-pixel-events";

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
  "h-14 w-full rounded-xl border border-black/25 bg-white px-4 font-store text-base font-medium text-on-surface placeholder:text-black/30 transition-all focus:border-black focus:outline-none focus:ring-2 focus:ring-black/5";

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
  const localizedInputClass = `${inputClass} ${
    locale === "ar"
      ? "text-right placeholder:text-right"
      : "text-left placeholder:text-left"
  }`;
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");
    trackInitiateCheckout({ productId, value: totalPrice, quantity });
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
      savePendingPurchase({ productId, value: totalPrice, quantity });
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
    <div id="order-form" className="order-form-card space-y-6 scroll-mt-24 rounded-2xl border border-black/15 p-5 md:p-6">
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
              className={localizedInputClass}
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
              placeholder={t("customerNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>{t("city")}</label>
            <input
              required
              className={localizedInputClass}
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoComplete="address-level2"
              placeholder={t("cityPlaceholder")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className={`${labelClass} order-form-phone-label`}>{t("phone")}</label>
          <input
            required
            type="tel"
            inputMode="numeric"
            className={localizedInputClass}
            dir={locale === "ar" ? "rtl" : "ltr"}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            autoComplete="tel-national"
            placeholder={t("phonePlaceholder")}
            pattern="0[5-7][0-9]{8}"
            maxLength={10}
            title={t("phoneFormatHint")}
          />
        </div>

        {!canSubmit ? (
          <p className="text-center text-sm text-on-surface-variant">{t("completeSelections")}</p>
        ) : null}

        <div className="order-cost-summary">
          <div className="order-cost-row">
            <span>{t("merchandisePrice")}</span>
            <strong>
              <MadPrice amount={totalPrice} locale={locale} />
            </strong>
          </div>
          <div className="order-cost-row">
            <span>{t("delivery")}</span>
            <strong>
              <MadPrice amount={0} locale={locale} />
            </strong>
          </div>
          <div className="order-cost-row order-cost-row-total">
            <span>{quantity > 1 ? t("bundleTotal", { count: quantity }) : t("total")}</span>
            <strong>
              <MadPrice amount={totalPrice} locale={locale} />
            </strong>
          </div>
        </div>

        <BrandButton
          type="submit"
          variant="primary"
          disabled={disabled}
          className="btn-brand-block order-form-cta"
        >
          {status === "loading" ? t("submitting") : t("submit")}
        </BrandButton>
        {status === "success" && (
          <p className="text-center text-sm brand-gold-text">{t("success")}</p>
        )}
        {status === "error" && <p className="text-center text-sm text-error">{t("error")}</p>}
      </form>
    </div>
  );
}
