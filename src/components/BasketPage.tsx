"use client";

import { useLocale, useTranslations } from "next-intl";
import { BrandButton } from "@/components/BrandButton";
import { ProductImage } from "@/components/ProductImage";
import { MadPrice } from "@/components/MadPrice";
import { useBasket } from "@/components/BasketProvider";
import { basketTotals, lineMerchandise } from "@/lib/basket";
import type { AppLocale } from "@/lib/product-i18n";

function itemName(item: { name: string; nameFr: string | null }, locale: AppLocale) {
  if (locale === "fr") return item.nameFr?.trim() || item.name;
  return item.name;
}

export function BasketPage() {
  const t = useTranslations("basket");
  const productT = useTranslations("product");
  const locale = useLocale() as AppLocale;
  const basket = useBasket();
  const totals = basketTotals(basket.items);

  if (!basket.ready) return <main className="basket-shell" />;

  return (
    <main className="basket-shell">
      <div className="basket-shell-inner">
        <header className="basket-hero">
          <p className="brand-eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          {basket.items.length > 0 ? (
            <p className="basket-intro">{t("count", { count: basket.count })}</p>
          ) : null}
        </header>

        {basket.items.length === 0 ? (
          <div className="basket-empty">
            <p>{t("empty")}</p>
            <BrandButton href="/products" variant="outline">
              {t("continue")}
            </BrandButton>
          </div>
        ) : (
          <div className="checkout-stage">
            <section className="checkout-panel basket-lines-panel">
              <ul className="basket-lines">
                {basket.items.map((item) => (
                  <li key={item.id} className="basket-line">
                    <div className="basket-line-media">
                      {item.image ? (
                        <ProductImage
                          src={item.image}
                          alt={itemName(item, locale)}
                          width={160}
                          height={200}
                        />
                      ) : null}
                    </div>
                    <div className="basket-line-copy">
                      <h2>{itemName(item, locale)}</h2>
                      <p>
                        {item.size}
                        {item.color ? ` · ${item.color}` : ""}
                      </p>
                      <div className="basket-line-actions">
                        <div className="basket-stepper">
                          <button
                            type="button"
                            aria-label={t("decrease")}
                            onClick={() => basket.setQuantity(item.id, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={t("increase")}
                            disabled={item.quantity >= item.maxQuantity}
                            onClick={() => basket.setQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="basket-remove"
                          onClick={() => basket.removeItem(item.id)}
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                    <strong className="basket-line-price">
                      <MadPrice amount={lineMerchandise(item)} locale={locale} />
                    </strong>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="checkout-rail">
              <p className="checkout-rail-kicker">{t("summary")}</p>
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
              <BrandButton href="/checkout" variant="primary" className="btn-brand-block checkout-submit">
                {t("checkout")}
              </BrandButton>
              <BrandButton href="/products" variant="outline" className="btn-brand-block checkout-rail-ghost">
                {t("continue")}
              </BrandButton>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
