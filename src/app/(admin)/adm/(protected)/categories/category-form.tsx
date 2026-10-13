"use client";

import { useActionState, useState } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
  type CategoryFormValues,
} from "@/lib/categories/actions";
import { categoryFilterPath, MAX_CATEGORY_DESCRIPTION_LENGTH, MAX_CATEGORY_NAME_LENGTH } from "@/lib/categories/format";
import type { CategoryField } from "@/lib/categories/save";
import { MAX_SLUG_LENGTH, slugify } from "@/lib/products/slug";

const FIELD =
  "rounded-md border bg-adm-bg px-3 py-2 text-sm text-adm-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted";

// What the edit page knows about the saved category.
type Saved = {
  id: number;
  values: CategoryFormValues;
  listedProductCount: number; // ACTIVE products using it
};

function fieldClass(invalid: boolean) {
  return `${FIELD} ${invalid ? "border-red-500" : "border-adm-border"}`;
}

function FieldError({ id, state, field }: { id: string; state: CategoryActionState; field: CategoryField }) {
  if (!state || state.ok || state.field !== field) return null;
  return (
    <p id={id} role="alert" className="text-sm text-red-700">
      {state.message}
    </p>
  );
}

/**
 * Add (no `saved`) or edit a category. Adding keeps you on the list, so the
 * fields clear after each success. The slug follows the name until it's
 * edited by hand, on add only.
 */
export default function CategoryForm({ saved }: { saved?: Saved }) {
  const editing = saved !== undefined;
  const [state, action, pending] = useActionState(editing ? updateCategoryAction : createCategoryAction, null);

  const [name, setName] = useState(saved?.values.name ?? "");
  const [slug, setSlug] = useState(saved?.values.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(editing);

  // Clear the add form after each category is added.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (!editing && state?.ok) {
      setName("");
      setSlug("");
      setSlugEdited(false);
    }
  }

  // Uncontrolled fields reset after every action; a failure's echoed values
  // win so nothing typed is lost.
  const values = state && !state.ok ? state.values : saved?.values;
  const invalid = (field: CategoryField) => Boolean(state && !state.ok && state.field === field);

  const renaming = editing && slug !== saved.values.slug;

  return (
    <form action={action} className="flex flex-col gap-6">
      {saved && <input type="hidden" name="categoryId" value={saved.id} />}

      <label className="flex flex-col gap-1 text-sm text-adm-muted">
        Name
        <input
          name="name"
          type="text"
          required
          maxLength={MAX_CATEGORY_NAME_LENGTH}
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
          www.shopcannan.com{categoryFilterPath(slug || "…")}
        </p>
        {renaming && saved.listedProductCount > 0 && (
          <p className="text-xs text-amber-700">
            Links to {categoryFilterPath(saved.values.slug)} will stop filtering and show every product instead.
          </p>
        )}
        <FieldError id="slug-error" state={state} field="slug" />
      </div>

      {editing && (
        <label className="flex flex-col gap-1 text-sm text-adm-muted">
          <span>
            Description <span className="text-xs">(optional, not shown on the storefront yet)</span>
          </span>
          <textarea
            name="description"
            rows={4}
            maxLength={MAX_CATEGORY_DESCRIPTION_LENGTH}
            defaultValue={values?.description}
            aria-invalid={invalid("description")}
            aria-describedby="description-error"
            className={fieldClass(invalid("description"))}
          />
          <FieldError id="description-error" state={state} field="description" />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-md bg-adm-fg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-adm-fg/85 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted"
        >
          {pending ? "Saving…" : editing ? "Save changes" : "Add category"}
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
    </form>
  );
}
