"use client";

import { useActionState } from "react";

import { deleteCategoryAction } from "@/lib/categories/actions";

export default function DeleteCategoryForm({ categoryId, name }: { categoryId: number; name: string }) {
  const [state, action, pending] = useActionState(deleteCategoryAction, null);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete "${name}"? This can't be undone.`)) event.preventDefault();
      }}
      className="flex flex-wrap items-center gap-4"
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md border border-red-500/40 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-muted"
      >
        {pending ? "Deleting…" : "Delete category"}
      </button>
      {state && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
