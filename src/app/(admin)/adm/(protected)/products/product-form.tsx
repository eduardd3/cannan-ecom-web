"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import type { ProductStatus } from "@/generated/prisma/enums";
import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
  type ProductFormValues,
} from "@/lib/products/actions";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUSES,
} from "@/lib/products/format";
import type { ProductField } from "@/lib/products/save";
import { MAX_SLUG_LENGTH, productPath, slugify } from "@/lib/products/slug";
import { MAX_OPTION_LENGTH } from "@/lib/products/variant-fields";

const FORM_ID = "product-form";

const CARD = "rounded-xl border border-adm-border bg-adm-surface p-6";

const FIELD =
  "rounded-md border bg-adm-bg px-3 py-2 text-sm text-adm-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted";

const STATUS_HINT: Record<ProductStatus, string> = {
  DRAFT: "Hidden from the storefront.",
  ACTIVE: "Shown on the storefront and can be bought.",
  ARCHIVED: "Hidden and retired. Past orders keep their details.",
};

type Options = {
  collections: { id: number; name: string; isDefault: boolean; facetLabel: string | null }[];
  productTypes: { id: number; name: string }[];
  categories: { id: number; name: string; collectionId: number }[];
};

// What the edit page knows about the saved product.
type Saved = {
  id: number;
  values: ProductFormValues;
  published: boolean; // has been listed at least once
  activeVariantCount: number;
};

function fieldClass(invalid: boolean) {
  return `${FIELD} ${invalid ? "border-red-500" : "border-adm-border"}`;
}

function FieldError({ id, state, field }: { id: string; state: ProductActionState; field: ProductField }) {
  if (!state || state.ok || state.field !== field) return null;
  return (
    <p id={id} role="alert" className="text-sm text-red-700">
      {state.message}
    </p>
  );
}

/**
 * Create (no `saved`) or edit a product. On create the slug follows the name
 * until it's edited by hand; on edit it never changes by itself, since a
 * listed product's slug is its public URL.
 *
 * On edit, `children` (the variant and image sections) render between the
 * details card and a status card that holds the save button. Those controls
 * sit outside the <form> and join it through the `form` attribute.
 */
export default function ProductForm({
  options,
  saved,
  children,
}: {
  options: Options;
  saved?: Saved;
  children?: ReactNode;
}) {
  const editing = saved !== undefined;
  const [state, action, pending] = useActionState(editing ? updateProductAction : createProductAction, null);

  const [name, setName] = useState(saved?.values.name ?? "");
  const [slug, setSlug] = useState(saved?.values.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(editing);

  // Uncontrolled fields reset after every action; a failure's echoed values
  // win so nothing typed is lost.
  const values = state && !state.ok ? state.values : saved?.values;
  const invalid = (field: ProductField) => Boolean(state && !state.ok && state.field === field);
  const defaultCollection =
    values?.collectionId ?? String(options.collections.find((c) => c.isDefault)?.id ?? options.collections[0]?.id ?? "");

  // The category list follows the collection: a category belongs to one.
  const [collectionId, setCollectionId] = useState(defaultCollection);
  const [categoryId, setCategoryId] = useState(values?.categoryId ?? "");
  const selectedCollection = options.collections.find((c) => String(c.id) === collectionId);
  const categories = options.categories.filter((c) => String(c.collectionId) === collectionId);

  const renaming = editing && slug !== saved.values.slug;
  const canList = (saved?.activeVariantCount ?? 0) > 0;

  const submitBar = (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="submit"
        form={FORM_ID}
        disabled={pending}
        className="cursor-pointer rounded-md bg-adm-fg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-adm-fg/85 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted"
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Create draft"}
      </button>
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-700">
          {state.message}
        </p>
      )}
      {state && !state.ok && !state.field && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
    </div>
  );

  return (
    <>
      <section aria-label="Details" className={CARD}>
        <form id={FORM_ID} action={action} className="flex flex-col gap-6">
          {saved && <input type="hidden" name="productId" value={saved.id} />}

          <label className="flex flex-col gap-1 text-sm text-adm-muted">
            Name
            <input
              name="name"
              type="text"
              required
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
              aria-invalid={invalid("name")}
              aria-describedby="name-error"
              className={fieldClass(invalid("name"))}
            />
            <FieldError id="name-error" state={state} field="name" />
          </label>

          <div className="flex flex-col gap-1 text-sm text-adm-muted">
            <label htmlFor="slug">URL slug</label>
            <div className="flex flex-wrap gap-2">
              <input
                id="slug"
                name="slug"
                type="text"
                required
                maxLength={MAX_SLUG_LENGTH}
                spellCheck={false}
                autoComplete="off"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setSlugEdited(true);
                }}
                aria-invalid={invalid("slug")}
                aria-describedby="slug-preview slug-error"
                className={`${fieldClass(invalid("slug"))} min-w-64 flex-1 font-mono`}
              />
              <button
                type="button"
                onClick={() => {
                  setSlug(slugify(name));
                  setSlugEdited(editing);
                }}
                className="cursor-pointer rounded-md border border-adm-border px-3 py-2 text-sm text-adm-fg transition-colors hover:bg-adm-border"
              >
                From name
              </button>
            </div>
            <p id="slug-preview" className="break-all text-xs">
              www.shopcannan.com{productPath(slug || "…")}
            </p>
            {renaming && (
              <p className="text-xs text-amber-700">
                {saved.published
                  ? `${productPath(saved.values.slug)} will redirect to the new URL, so existing links keep working.`
                  : "This product has never been listed, so the old URL isn't kept."}
              </p>
            )}
            <FieldError id="slug-error" state={state} field="slug" />
          </div>

          <label className="flex flex-col gap-1 text-sm text-adm-muted">
            Description
            <textarea
              name="description"
              required
              rows={6}
              maxLength={MAX_DESCRIPTION_LENGTH}
              defaultValue={values?.description}
              aria-invalid={invalid("description")}
              aria-describedby="description-error"
              className={fieldClass(invalid("description"))}
            />
            <FieldError id="description-error" state={state} field="description" />
          </label>

          <label className="flex flex-col gap-1 text-sm text-adm-muted">
            Collection
            <select
              name="collectionId"
              value={collectionId}
              onChange={(event) => {
                setCollectionId(event.target.value);
                setCategoryId("");
              }}
              aria-invalid={invalid("collectionId")}
              className={`${fieldClass(invalid("collectionId"))} w-fit`}
            >
              {options.collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            <FieldError id="collection-error" state={state} field="collectionId" />
          </label>

          <label className="flex flex-col gap-1 text-sm text-adm-muted">
            Type
            <select
              name="productTypeId"
              required
              defaultValue={values?.productTypeId ?? ""}
              aria-invalid={invalid("productTypeId")}
              aria-describedby="type-error"
              className={`${fieldClass(invalid("productTypeId"))} w-fit`}
            >
              <option value="" disabled>
                Choose a type
              </option>
              {options.productTypes.map((productType) => (
                <option key={productType.id} value={productType.id}>
                  {productType.name}
                </option>
              ))}
            </select>
            <FieldError id="type-error" state={state} field="productTypeId" />
          </label>

          <div className="flex flex-col gap-1 text-sm text-adm-muted">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="category">{selectedCollection?.facetLabel ?? "Category"} (optional)</label>
              {/* New tab so nothing typed here is lost; reload this page to see new categories. */}
              <Link
                href="/adm/categories"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline underline-offset-2 hover:text-adm-fg"
              >
                Manage categories
              </Link>
            </div>
            {categories.length === 0 ? (
              <p className="text-xs">No categories in this collection.</p>
            ) : (
              <select
                id="category"
                name="categoryId"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                aria-invalid={invalid("categoryId")}
                aria-describedby="category-error"
                className={`${fieldClass(invalid("categoryId"))} w-fit`}
              >
                <option value="">None</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
            <FieldError id="category-error" state={state} field="categoryId" />
          </div>

          <fieldset className="flex flex-col gap-2 text-sm text-adm-muted">
            <legend>
              Options <span className="text-xs">(leave blank for a product with a single variant)</span>
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                Option 1 name
                <input
                  name="option1Name"
                  type="text"
                  maxLength={MAX_OPTION_LENGTH}
                  placeholder="e.g. Color"
                  defaultValue={values?.option1Name}
                  aria-invalid={invalid("option1Name")}
                  aria-describedby="options-error"
                  className={fieldClass(invalid("option1Name"))}
                />
              </label>
              <label className="flex flex-col gap-1">
                Option 2 name
                <input
                  name="option2Name"
                  type="text"
                  maxLength={MAX_OPTION_LENGTH}
                  placeholder="e.g. Size"
                  defaultValue={values?.option2Name}
                  aria-invalid={invalid("option1Name")}
                  aria-describedby="options-error"
                  className={fieldClass(invalid("option1Name"))}
                />
              </label>
            </div>
            <p className="text-xs">Option 1 shows first in the picker. Once there are variants, options can be renamed but not added or removed.</p>
            <FieldError id="options-error" state={state} field="option1Name" />
          </fieldset>

          {!editing && submitBar}
        </form>
      </section>

      {children}

      {saved && (
        <section aria-labelledby="status-heading" className={`${CARD} flex flex-col gap-6`}>
          <div>
            <h2 id="status-heading" className="font-semibold text-adm-fg">
              Status
            </h2>
            <p className="mt-1 text-sm text-adm-muted">
              Saving applies the details above and this status. Variants and images save on their own.
            </p>
          </div>
          <fieldset aria-labelledby="status-heading" className="flex flex-col gap-2 text-sm text-adm-muted">
            {PRODUCT_STATUSES.map((status) => {
              const blocked = status === "ACTIVE" && !canList && saved.values.status !== "ACTIVE";
              return (
                <label key={status} className={`flex items-start gap-2 ${blocked ? "opacity-50" : ""}`}>
                  <input
                    type="radio"
                    name="status"
                    form={FORM_ID}
                    value={status}
                    defaultChecked={(values?.status ?? saved.values.status) === status}
                    disabled={blocked}
                    className="mt-1 accent-adm-fg"
                  />
                  <span>
                    <span className="text-adm-fg">{PRODUCT_STATUS_LABEL[status]}</span>
                    <span className="block text-xs">
                      {blocked ? "Add an active variant before listing." : STATUS_HINT[status]}
                    </span>
                  </span>
                </label>
              );
            })}
            <FieldError id="status-error" state={state} field="status" />
          </fieldset>
          <label className="flex items-start gap-2 text-sm text-adm-muted">
            <input
              type="checkbox"
              name="featured"
              form={FORM_ID}
              defaultChecked={values?.featured ?? saved.values.featured}
              className="mt-1 accent-adm-fg"
            />
            <span>
              <span className="text-adm-fg">Featured on homepage</span>
              <span className="block text-xs">
                Shown first in the homepage&apos;s featured pieces while the product is active.
              </span>
            </span>
          </label>
          {submitBar}
        </section>
      )}
    </>
  );
}
