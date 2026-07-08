"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/MaterialIcon";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import type { CategoryForClient } from "@/lib/category-serialize";

type CategoryForm = {
  name: string;
  nameAr: string;
  nameFr: string;
  sortOrder: string;
};

const EMPTY_FORM: CategoryForm = {
  name: "",
  nameAr: "",
  nameFr: "",
  sortOrder: "0",
};

type Props = {
  categories: CategoryForClient[];
  productCounts: Record<string, number>;
  saving: boolean;
  deletingId: string | null;
  onCreate: (form: CategoryForm) => Promise<void>;
  onUpdate: (id: string, form: CategoryForm) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function AdminCategoriesView({
  categories,
  productCounts,
  saving,
  deletingId,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const t = useTranslations("admin");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [error, setError] = useState("");

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: String(categories.length) });
    setError("");
    setShowForm(true);
  }

  function openEdit(cat: CategoryForClient) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      nameAr: cat.nameAr ?? "",
      nameFr: cat.nameFr ?? "",
      sortOrder: String(cat.sortOrder),
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await onUpdate(editingId, form);
      else await onCreate(form);
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("categorySaveError"));
    }
  }

  return (
    <>
      <section className="admin-section">
        <div className="admin-section-head">
          <div>
            <h2 className="admin-section-title">{t("navCategories")}</h2>
            <p className="admin-section-subtitle">{t("categoriesSubtitle", { count: categories.length })}</p>
          </div>
          <button type="button" onClick={openCreate} className="admin-btn-primary">
            <MaterialIcon name="add" className="!text-lg" />
            {t("addCategory")}
          </button>
        </div>

        {sorted.length === 0 ? (
          <AdminEmptyState
            icon="category"
            title={t("noCategories")}
            description={t("noCategoriesHint")}
            action={
              <button type="button" onClick={openCreate} className="admin-btn-primary">
                <MaterialIcon name="add" className="!text-lg" />
                {t("addCategory")}
              </button>
            }
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("categoryNameEn")}</th>
                  <th>{t("categoryNameAr")}</th>
                  <th>{t("categoryNameFr")}</th>
                  <th>{t("categorySortOrder")}</th>
                  <th>{t("categoryProductCount")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((cat) => (
                  <tr key={cat.id}>
                    <td className="font-medium">{cat.name}</td>
                    <td dir="rtl">{cat.nameAr || "—"}</td>
                    <td>{cat.nameFr || "—"}</td>
                    <td>{cat.sortOrder}</td>
                    <td>{productCounts[cat.name] ?? 0}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(cat)} className="admin-btn-ghost !flex-none">
                          <MaterialIcon name="edit" className="!text-base" />
                          {t("edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(cat.id)}
                          disabled={deletingId === cat.id}
                          className="admin-btn-danger"
                        >
                          {deletingId === cat.id ? t("deleting") : t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeForm}>
          <form className="admin-modal max-w-lg" onSubmit={(e) => void handleSubmit(e)} onClick={(e) => e.stopPropagation()}>
            <header className="admin-modal-header">
              <div>
                <p className="brand-eyebrow">{editingId ? t("editCategory") : t("addCategory")}</p>
                <h2 className="font-headline text-2xl text-on-surface">
                  {editingId ? t("editCategory") : t("addCategory")}
                </h2>
              </div>
              <button type="button" onClick={closeForm} className="admin-icon-btn" aria-label={t("cancel")}>
                <MaterialIcon name="close" className="!text-xl" />
              </button>
            </header>
            <div className="admin-modal-body space-y-4">
              {error ? <p className="text-sm text-error">{error}</p> : null}
              <label className="admin-field">
                <span>{t("categoryNameEn")}</span>
                <input
                  required
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>{t("categoryNameAr")}</span>
                <input
                  className="admin-input"
                  dir="rtl"
                  value={form.nameAr}
                  onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>{t("categoryNameFr")}</span>
                <input
                  className="admin-input"
                  value={form.nameFr}
                  onChange={(e) => setForm((f) => ({ ...f, nameFr: e.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>{t("categorySortOrder")}</span>
                <input
                  type="number"
                  className="admin-input"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </label>
            </div>
            <footer className="admin-modal-footer">
              <button type="button" onClick={closeForm} className="admin-btn-ghost !flex-none">
                {t("cancel")}
              </button>
              <button type="submit" disabled={saving} className="admin-btn-primary">
                {saving ? t("updating") : editingId ? t("saveChanges") : t("addCategory")}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}

export type { CategoryForm };
