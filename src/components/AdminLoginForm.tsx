"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { BrandButton } from "@/components/BrandButton";
import { MaterialIcon } from "@/components/MaterialIcon";

export function AdminLoginForm() {
  const t = useTranslations("admin");
  const brand = useTranslations("brand");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "Login failed");
      }
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <aside className="admin-login-brand">
        <BrandLogo height={56} variant="dark" alt={brand("name")} />
        <p className="brand-eyebrow brand-eyebrow-light mt-8">{t("panelLabel")}</p>
        <h1 className="mt-3 font-headline text-4xl leading-tight text-brand-ivory">{brand("name")}</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-ivory/70">{t("dashIntro")}</p>
        <div className="mt-10 flex flex-col gap-3 text-sm text-brand-ivory/60">
          <span className="flex items-center gap-2">
            <MaterialIcon name="inventory_2" className="!text-lg brand-gold-text" />
            {t("navProducts")}
          </span>
          <span className="flex items-center gap-2">
            <MaterialIcon name="receipt_long" className="!text-lg brand-gold-text" />
            {t("navOrders")}
          </span>
          <span className="flex items-center gap-2">
            <MaterialIcon name="payments" className="!text-lg brand-gold-text" />
            {t("kpiRevenue")}
          </span>
        </div>
      </aside>

      <div className="admin-login-form-wrap">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-5">
          <div className="mb-2 flex justify-center lg:hidden">
            <BrandLogo height={52} alt={brand("name")} />
          </div>
          <div className="text-center lg:text-left">
            <p className="brand-eyebrow">{t("panelLabel")}</p>
            <h2 className="mt-2 font-headline text-3xl text-on-surface">{t("loginTitle")}</h2>
            <p className="mt-2 text-sm text-on-surface-variant">{t("loginSubtitle")}</p>
          </div>

          <label className="admin-field">
            <span>{t("loginEmail")}</span>
            <input
              type="email"
              className="admin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="admin-field">
            <span>{t("loginPassword")}</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="admin-input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              >
                <MaterialIcon name={showPassword ? "visibility_off" : "visibility"} className="!text-xl" />
              </button>
            </div>
          </label>

          {error ? (
            <p className="flex items-center gap-2 rounded-lg bg-error-container px-3 py-2 text-sm text-error">
              <MaterialIcon name="error" className="!text-lg" />
              {error}
            </p>
          ) : null}

          <BrandButton type="submit" variant="primary" disabled={loading} className="btn-brand-block w-full">
            {loading ? t("loginLoading") : t("loginSubmit")}
          </BrandButton>
        </form>
      </div>
    </div>
  );
}
