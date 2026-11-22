"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandButton } from "@/components/BrandButton";
import { MadPrice } from "@/components/MadPrice";
import { ProductImage } from "@/components/ProductImage";
import { useBasket } from "@/components/BasketProvider";
import { Link, useRouter } from "@/i18n/navigation";
import { basketTotals, lineMerchandise } from "@/lib/basket";
import type { AppLocale } from "@/lib/product-i18n";
import {
  getMetaBrowserIds,
  savePendingPurchase,
  setMetaPixelUserData,
  trackInitiateCheckout,
} from "@/lib/meta-pixel-events";
import { readConsentPreferences } from "@/lib/consent";
import { readStoredUtm } from "@/lib/meta-utm";
import { readFirstTouchFbclid, readFirstTouchLandingUrl } from "@/lib/meta-first-touch";

type CitySuggestion = { id: number; name: string; ville: string };

function itemName(item: { name: string; nameFr: string | null }, locale: AppLocale) {
  if (locale === "fr") return item.nameFr?.trim() || item.name;
  return item.name;
}

export function CheckoutPage() {
  const t = useTranslations("basket");
  const productT = useTranslations("product");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const basket = useBasket();
  const totals = basket.ready ? basketTotals(basket.items) : { merchandise: 0, delivery: 0, total: 0 };
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [cityBusy, setCityBusy] = useState(false);
  const [matchedCity, setMatchedCity] = useState<string | null>(null);
  const [cityHint, setCityHint] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const cityMatched = Boolean(matchedCity && city.trim() === matchedCity);

  useEffect(() => {
    const query = city.trim();
    if (matchedCity && query === matchedCity) {
      setCityBusy(false);
      setCityHint(t("cityMatched", { city: matchedCity }));
      setCitySuggestions([]);
      return;
    }

    if (query.length < 2) {
      setCityBusy(false);
      setMatchedCity(null);
      setCityHint(query.length === 0 ? "" : t("cityPick"));
      setCitySuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCityBusy(true);
      void fetch(`/api/shipping/cities?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          const data = (await res.json()) as {
            ok?: boolean;
            configured?: boolean;
            city?: string;
            cities?: CitySuggestion[];
          };
          if (data.configured === false) {
            setMatchedCity(null);
            setCityHint(t("cityUnavailable"));
            setCitySuggestions([]);
            return;
          }
          const suggestions = Array.isArray(data.cities) ? data.cities : [];
          if (data.ok && data.city) {
            setMatchedCity(data.city);
            // Keep typed casing until click/blur unless Sendit returns a different label.
            if (query !== data.city) setCity(data.city);
            setCityHint(t("cityMatched", { city: data.city }));
            setCitySuggestions([]);
            return;
          }
          setMatchedCity(null);
          setCitySuggestions(suggestions);
          setCityHint(suggestions.length > 0 ? t("cityPick") : t("cityUnknown"));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setMatchedCity(null);
          setCityHint(t("cityUnknown"));
          setCitySuggestions([]);
        })
        .finally(() => setCityBusy(false));
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [city, matchedCity, t]);

  if (!basket.ready) return <main className="basket-shell" />;

  if (basket.items.length === 0) {
    return (
      <main className="basket-shell">
        <div className="basket-shell-inner">
          <header className="basket-hero">
            <p className="brand-eyebrow">{t("eyebrow")}</p>
            <h1>{t("checkoutTitle")}</h1>
          </header>
          <div className="basket-empty">
            <p>{t("empty")}</p>
            <BrandButton href="/products" variant="outline">
              {t("continue")}
            </BrandButton>
          </div>
        </div>
      </main>
    );
  }

  const first = basket.items[0]!;
  const quantity = basket.items.reduce((sum, item) => sum + item.quantity, 0);
  const canSubmit =
    status !== "loading" &&
    customerName.trim().length > 0 &&
    cityMatched &&
    streetAddress.trim().length >= 3 &&
    /^0[5-7][0-9]{8}$/.test(phone);

  async function submitOrder() {
    if (status === "loading") return;
    if (!customerName.trim()) {
      setError(productT("error"));
      setStatus("error");
      return;
    }
    if (!cityMatched || !matchedCity) {
      setError(t("cityPick"));
      setStatus("error");
      return;
    }
    if (streetAddress.trim().length < 3) {
      setError(t("addressRequired"));
      setStatus("error");
      return;
    }
    if (!/^0[5-7][0-9]{8}$/.test(phone)) {
      setError(productT("phoneFormatHint"));
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      setMetaPixelUserData({ phone, fullName: customerName, city });
      trackInitiateCheckout({
        productId: first.productId,
        productName: itemName(first, locale),
        value: totals.total,
        quantity,
        unitPrice: totals.total / quantity,
        user: { phone, fullName: customerName, city },
      });

      const { fbp, fbc } = getMetaBrowserIds();
      const utm = readStoredUtm();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          city: matchedCity,
          streetAddress: streetAddress.trim(),
          items: basket.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
          meta: {
            fbp,
            fbc,
            fbclid: readFirstTouchFbclid(),
            landingEventSourceUrl: readFirstTouchLandingUrl(),
            eventSourceUrl: window.location.href,
            productName: basket.items.map((item) => itemName(item, locale)).join(" · "),
            marketingConsent: readConsentPreferences()?.marketing ?? null,
            utmSource: utm.utmSource,
            utmMedium: utm.utmMedium,
            utmCampaign: utm.utmCampaign,
            utmContent: utm.utmContent,
            utmTerm: utm.utmTerm,
          },
        }),
      });
      const body = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok || !body?.id) {
        setError(checkoutError(body?.error, t, productT));
        setStatus("error");
        return;
      }
      savePendingPurchase({
        productId: first.productId,
        productName: itemName(first, locale),
        value: totals.total,
        quantity,
        orderId: body.id,
      });
      basket.clear();
      router.push("/thank-you");
    } catch {
      setError(productT("error"));
      setStatus("error");
    }
  }

  return (
    <main className="basket-shell">
      <div className="basket-shell-inner">
        <header className="basket-hero">
          <p className="brand-eyebrow">{t("eyebrow")}</p>
          <h1>{t("checkoutTitle")}</h1>
          <p className="basket-intro">{t("checkoutSubtitle")}</p>
        </header>

        <div className="checkout-stage">
          <section className="checkout-panel" aria-label={t("checkoutTitle")}>
            <div className="checkout-panel-head">
              <p className="checkout-step">{t("detailsStep")}</p>
              <p className="checkout-trust">{t("codNote")}</p>
            </div>

            <div className="checkout-fields">
              <label className="checkout-field">
                <span>{productT("customerName")}</span>
                <input
                  value={customerName}
                  autoComplete="name"
                  placeholder={productT("customerNamePlaceholder")}
                  onChange={(event) => {
                    setCustomerName(event.target.value);
                    if (error) setError("");
                  }}
                />
              </label>

              <div className={`checkout-field checkout-field-wide checkout-city-field${cityMatched ? " is-matched" : ""}`}>
                <span>{productT("city")}</span>
                <input
                  value={city}
                  autoComplete="off"
                  placeholder={productT("cityPlaceholder")}
                  role="combobox"
                  aria-expanded={citySuggestions.length > 0}
                  aria-controls="checkout-city-suggestions"
                  aria-autocomplete="list"
                  onChange={(event) => {
                    setCity(event.target.value);
                    setMatchedCity(null);
                    if (error) setError("");
                  }}
                />
                {cityBusy ? <em>{t("citySearching")}</em> : null}
                {!cityBusy && cityHint ? (
                  <em className={cityMatched ? "checkout-city-ok" : "checkout-city-warn"}>{cityHint}</em>
                ) : null}
                {citySuggestions.length > 0 ? (
                  <div id="checkout-city-suggestions" className="checkout-city-suggestions" role="listbox">
                    {citySuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        role="option"
                        aria-selected={city === suggestion.name}
                        onClick={() => {
                          setCity(suggestion.name);
                          setMatchedCity(suggestion.name);
                          setCityHint(t("cityMatched", { city: suggestion.name }));
                          setCitySuggestions([]);
                          if (error) setError("");
                        }}
                      >
                        <strong>{suggestion.name}</strong>
                        {suggestion.ville && suggestion.ville !== suggestion.name ? (
                          <span className="checkout-city-ville">{suggestion.ville}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="checkout-field checkout-field-wide">
                <span>{t("streetAddress")}</span>
                <textarea
                  value={streetAddress}
                  autoComplete="street-address"
                  rows={3}
                  placeholder={t("streetAddressPlaceholder")}
                  onChange={(event) => {
                    setStreetAddress(event.target.value.slice(0, 500));
                    if (error) setError("");
                  }}
                />
              </label>

              <label className="checkout-field checkout-field-wide">
                <span>{productT("phone")}</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={phone}
                  autoComplete="tel-national"
                  placeholder={productT("phonePlaceholder")}
                  maxLength={10}
                  onChange={(event) => {
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                    if (error) setError("");
                  }}
                />
                <em>{productT("phoneFormatHint")}</em>
              </label>
            </div>

            {error ? (
              <p className="checkout-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              className="btn-brand btn-brand-block checkout-submit"
              disabled={!canSubmit}
              onClick={() => void submitOrder()}
            >
              {status === "loading" ? productT("submitting") : productT("submit")}
            </button>

            <Link href="/basket" className="checkout-back">
              {t("edit")}
            </Link>
          </section>

          <aside className="checkout-rail">
            <p className="checkout-rail-kicker">{t("summary")}</p>
            <ul className="checkout-rail-lines">
              {basket.items.map((item) => (
                <li key={item.id}>
                  <div className="checkout-rail-media">
                    {item.image ? (
                      <ProductImage
                        src={item.image}
                        alt={itemName(item, locale)}
                        width={96}
                        height={120}
                      />
                    ) : null}
                  </div>
                  <div className="checkout-rail-copy">
                    <strong>{itemName(item, locale)}</strong>
                    <span>
                      {item.size}
                      {item.color ? ` · ${item.color}` : ""} · ×{item.quantity}
                    </span>
                  </div>
                  <MadPrice amount={lineMerchandise(item)} locale={locale} />
                </li>
              ))}
            </ul>

            <div className="checkout-rail-totals">
              <div>
                <span>{productT("merchandisePrice")}</span>
                <MadPrice amount={totals.merchandise} locale={locale} />
              </div>
              <div>
                <span>{productT("delivery")}</span>
                <strong>
                  {totals.delivery === 0 ? (
                    productT("freeDelivery")
                  ) : (
                    <MadPrice amount={totals.delivery} locale={locale} />
                  )}
                </strong>
              </div>
              <div className="checkout-rail-total">
                <span>{productT("total")}</span>
                <MadPrice amount={totals.total} locale={locale} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function checkoutError(
  code: string | undefined,
  t: (
    key:
      | "unavailable"
      | "quantityUnavailable"
      | "invalidSelection"
      | "addressRequired"
      | "cityPick"
      | "cityUnknown",
  ) => string,
  productT: (key: "phoneFormatHint" | "error") => string,
) {
  if (code === "Product not found") return t("unavailable");
  if (code === "Quantity is not available") return t("quantityUnavailable");
  if (code === "Delivery address is required") return t("addressRequired");
  if (code === "City is outside delivery area") return t("cityUnknown");
  if (code === "Invalid size" || code === "Invalid color variant" || code === "Invalid basket") {
    return t("invalidSelection");
  }
  if (code === "Invalid Moroccan phone number") return productT("phoneFormatHint");
  return productT("error");
}
