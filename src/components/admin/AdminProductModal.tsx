"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { ProductImageUploader } from "@/components/ProductImageUploader";
import { AdminColorVariantPicker } from "@/components/admin/AdminColorVariantPicker";
import { PRESET_CATEGORIES, type ProductFormState } from "@/components/admin/types";
import type { CategoryForClient } from "@/lib/category-serialize";
import { getLocalizedCategoryLabel } from "@/lib/category-serialize";
import type { AppLocale } from "@/lib/product-i18n";
import { useLocale } from "next-intl";

type Props = {
  open: boolean;
  editingId: string | null;
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  creating: boolean;
  imageUploadBusy: boolean;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  categories: CategoryForClient[];
};

export function AdminProductModal({
  open,
  editingId,
  form,
  setForm,
  creating,
  imageUploadBusy,
  onBusyChange,
  onClose,
  onSubmit,
  categories,
}: Props) {
  const t = useTranslations("admin");
  const locale = useLocale() as AppLocale;
  if (!open) return null;

  const categoryOptions =
    categories.length > 0
      ? categories
      : PRESET_CATEGORIES.map((name, index) => ({
          id: name,
          name,
          nameAr: null,
          nameFr: null,
          sortOrder: index,
        }));

  const canSave = form.imageUrls.length > 0 && !imageUploadBusy && !creating;

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        className="admin-modal"
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-header">
          <div>
            <p className="brand-eyebrow">{editingId ? t("editProduct") : t("addProduct")}</p>
            <h2 className="font-headline text-2xl text-on-surface">
              {editingId ? form.name || t("editProduct") : t("addProduct")}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="admin-icon-btn" aria-label={t("cancel")}>
            <MaterialIcon name="close" className="!text-xl" />
          </button>
        </header>

        <div className="admin-modal-body">
          <section className="admin-form-section">
            <h3 className="admin-form-section-title">
              <MaterialIcon name="badge" className="!text-lg brand-gold-text" />
              {t("sectionNames")}
            </h3>
            <div className="admin-form-grid">
              <label className="admin-field sm:col-span-2">
                <span>{t("nameEn")}</span>
                <input required className="admin-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>{t("nameAr")}</span>
                <input className="admin-input" dir="rtl" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>{t("nameFr")}</span>
                <input className="admin-input" value={form.nameFr} onChange={(e) => setForm((f) => ({ ...f, nameFr: e.target.value }))} />
              </label>
            </div>
          </section>

          <section className="admin-form-section">
            <h3 className="admin-form-section-title">
              <MaterialIcon name="payments" className="!text-lg brand-gold-text" />
              {t("sectionPricing")}
            </h3>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t("priceMad")}</span>
                <input required type="number" min={0} step="0.01" className="admin-input" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>{t("priceFor2")}</span>
                <input type="number" min={0} step="0.01" className="admin-input" placeholder={t("priceFor2Hint")} value={form.priceFor2} onChange={(e) => setForm((f) => ({ ...f, priceFor2: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>{t("priceFor3")}</span>
                <input type="number" min={0} step="0.01" className="admin-input" placeholder={t("priceFor3Hint")} value={form.priceFor3} onChange={(e) => setForm((f) => ({ ...f, priceFor3: e.target.value }))} />
              </label>
            </div>
          </section>

          <section className="admin-form-section">
            <h3 className="admin-form-section-title">
              <MaterialIcon name="category" className="!text-lg brand-gold-text" />
              {t("category")}
            </h3>
            <div className="admin-category-grid">
              {categoryOptions.map((cat) => {
                const checked = form.categories.includes(cat.name);
                return (
                  <label key={cat.id} className={`admin-category-chip ${checked ? "admin-category-chip-active" : ""}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          categories: e.target.checked
                            ? [...f.categories, cat.name]
                            : f.categories.filter((c) => c !== cat.name),
                        }))
                      }
                    />
                    {getLocalizedCategoryLabel(cat, locale)}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="admin-form-section">
            <h3 className="admin-form-section-title">
              <MaterialIcon name="description" className="!text-lg brand-gold-text" />
              {t("sectionDescriptions")}
            </h3>
            <div className="admin-form-grid">
              <label className="admin-field sm:col-span-2">
                <span>{t("descriptionEn")}</span>
                <textarea required rows={3} className="admin-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </label>
              <label className="admin-field sm:col-span-2">
                <span>{t("descriptionAr")}</span>
                <textarea rows={2} dir="rtl" className="admin-input" value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))} />
              </label>
              <label className="admin-field sm:col-span-2">
                <span>{t("descriptionFr")}</span>
                <textarea rows={2} className="admin-input" value={form.descriptionFr} onChange={(e) => setForm((f) => ({ ...f, descriptionFr: e.target.value }))} />
              </label>
            </div>
          </section>

          <section className="admin-form-section">
            <h3 className="admin-form-section-title">
              <MaterialIcon name="photo_library" className="!text-lg brand-gold-text" />
              {t("uploadImages")}
            </h3>
            <ProductImageUploader
              value={form.imageUrls}
              setUrls={(action) =>
                setForm((f) => ({
                  ...f,
                  imageUrls: typeof action === "function" ? action(f.imageUrls) : action,
                }))
              }
              disabled={creating}
              onBusyChange={onBusyChange}
            />
          </section>

          <section className="admin-form-section">
            <h3 className="admin-form-section-title">
              <MaterialIcon name="palette" className="!text-lg brand-gold-text" />
              {t("sectionVariants")}
            </h3>
            <AdminColorVariantPicker
              value={form.colorVariants}
              onChange={(colorVariants) => setForm((f) => ({ ...f, colorVariants }))}
              disabled={creating}
            />
          </section>
        </div>

        <footer className="admin-modal-footer">
          {!canSave && form.imageUrls.length === 0 ? (
            <p className="mr-auto text-xs text-on-surface-variant">{t("needOneImage")}</p>
          ) : imageUploadBusy ? (
            <p className="mr-auto text-xs text-on-surface-variant">{t("waitForUploads")}</p>
          ) : (
            <span className="mr-auto" />
          )}
          <button type="button" onClick={onClose} className="admin-btn-ghost">
            {t("cancel")}
          </button>
          <button type="submit" disabled={!canSave} className="admin-btn-primary">
            {creating ? (editingId ? t("updating") : t("creating")) : editingId ? t("saveChanges") : t("saveProduct")}
          </button>
        </footer>
      </form>
    </div>
  );
}
