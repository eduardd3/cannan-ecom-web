"use client";

import { useActionState, useState } from "react";

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

const FIELD =
  "rounded-md border bg-[#0F1114] px-3 py-2 text-sm text-[#F2F3F4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]";

const STATUS_HINT: Record<ProductStatus, string> = {
  DRAFT: "Hidden from the storefront.",
  ACTIVE: "Shown on the storefront and can be bought.",
  ARCHIVED: "Hidden and retired. Past orders keep their details.",
};

type Options = {
  collections: { id: number; name: string; isDefault: boolean }[];
  categories: { id: number; name: string }[];
};

// What the edit page knows about the saved product.
type Saved = {
  id: number;
  values: ProductFormValues;
  published: boolean; // has been listed at least once
  activeVariantCount: number;
};

function fieldClass(invalid: boolean) {
  return `${FIELD} ${invalid ? "border-red-400/70" : "border-[#2A2F36]"}`;
}

function FieldError({ id, state, field }: { id: string; state: ProductActionState; field: ProductField }) {
  if (!state || state.ok || state.field !== field) return null;
  return (
    <p id={id} role="alert" className="text-sm text-red-300">
      {state.message}
    </p>
  );
}

/**
 * Create (no `saved`) or edit a product. On create the slug follows the name
 * until it's edited by hand; on edit it never changes by itself, since a
 * listed product's slug is its public URL.
 */
export default function ProductForm({ options, saved }: { options: Options; saved?: Saved }) {
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

  const renaming = editing && slug !== saved.values.slug;
  const canList = (saved?.activeVariantCount ?? 0) > 0;

  return (
    <form action={action} className="flex flex-col gap-6">
      {saved && <input type="hidden" name="productId" value={saved.id} />}

      <label className="flex flex-col gap-1 text-sm text-[#9AA1AB]">
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

      <div className="flex flex-col gap-1 text-sm text-[#9AA1AB]">
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
            className="cursor-pointer rounded-md border border-[#2A2F36] px-3 py-2 text-sm text-[#F2F3F4] transition-colors hover:bg-[#2A2F36]"
          >
            From name
          </button>
        </div>
        <p id="slug-preview" className="break-all text-xs">
          www.shopcannan.com{productPath(slug || "…")}
        </p>
        {renaming && (
          <p className="text-xs text-amber-300">
            {saved.published
              ? `${productPath(saved.values.slug)} will redirect to the new URL, so existing links keep working.`
              : "This product has never been listed, so the old URL isn't kept."}
          </p>
        )}
        <FieldError id="slug-error" state={state} field="slug" />
      </div>

      <label className="flex flex-col gap-1 text-sm text-[#9AA1AB]">
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

      <label className="flex flex-col gap-1 text-sm text-[#9AA1AB]">
        Collection
        <select
          name="collectionId"
          defaultValue={defaultCollection}
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

      <fieldset className="flex flex-col gap-2 text-sm text-[#9AA1AB]">
        <legend className="mb-1">Categories</legend>
        {options.categories.length === 0 ? (
          <p>No categories yet.</p>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {options.categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-[#F2F3F4]">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  defaultChecked={values?.categoryIds.includes(String(category.id))}
                  className="accent-[#9AA1AB]"
                />
                {category.name}
              </label>
            ))}
          </div>
        )}
        <FieldError id="categories-error" state={state} field="categoryIds" />
      </fieldset>

      {saved && (
        <fieldset className="flex flex-col gap-2 text-sm text-[#9AA1AB]">
          <legend className="mb-1">Status</legend>
          {PRODUCT_STATUSES.map((status) => {
            const blocked = status === "ACTIVE" && !canList && saved.values.status !== "ACTIVE";
            return (
              <label key={status} className={`flex items-start gap-2 ${blocked ? "opacity-50" : ""}`}>
                <input
                  type="radio"
                  name="status"
                  value={status}
                  defaultChecked={(values?.status ?? saved.values.status) === status}
                  disabled={blocked}
                  className="mt-1 accent-[#9AA1AB]"
                />
                <span>
                  <span className="text-[#F2F3F4]">{PRODUCT_STATUS_LABEL[status]}</span>
                  <span className="block text-xs">
                    {blocked ? "Add an active variant before listing." : STATUS_HINT[status]}
                  </span>
                </span>
              </label>
            );
          })}
          <FieldError id="status-error" state={state} field="status" />
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-md bg-[#F2F3F4] px-4 py-2 text-sm font-medium text-[#16191E] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]"
        >
          {pending ? "Saving…" : editing ? "Save changes" : "Create draft"}
        </button>
        {state?.ok && (
          <p role="status" className="text-sm text-emerald-300">
            {state.message}
          </p>
        )}
        {state && !state.ok && !state.field && (
          <p role="alert" className="text-sm text-red-300">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
