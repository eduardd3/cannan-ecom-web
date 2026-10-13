"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import {
  deleteImageAction,
  moveImageAction,
  requestImageUploadAction,
  saveImageAction,
  updateImageAction,
  type ImageActionState,
} from "@/lib/products/image-actions";
import {
  ACCEPT_ATTRIBUTE,
  fileProblem,
  MAX_ALT_LENGTH,
  MAX_IMAGES_PER_PRODUCT,
  normalizeAlt,
} from "@/lib/products/image-fields";

export type ImageTile = { id: number; url: string; alt: string; variantId: number | null };
export type VariantChoice = { id: number; label: string };

const FIELD =
  "w-full rounded-md border border-[#2A2F36] bg-[#0F1114] px-3 py-2 text-sm text-[#F2F3F4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]";
const PRIMARY_BUTTON =
  "cursor-pointer rounded-md bg-[#F2F3F4] px-4 py-2 text-sm font-medium text-[#16191E] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]";
const SMALL_BUTTON =
  "cursor-pointer rounded-md border border-[#2A2F36] px-2 py-1 text-xs text-[#F2F3F4] transition-colors hover:bg-[#2A2F36] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA1AB]";

function ErrorText({ state }: { state: ImageActionState }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="text-xs text-red-300">
      {state.message}
    </p>
  );
}

function VariantSelect({ variants, defaultValue }: { variants: VariantChoice[]; defaultValue: number | null }) {
  return (
    <select name="variantId" defaultValue={defaultValue ?? ""} className={FIELD}>
      <option value="">All variants</option>
      {variants.map((variant) => (
        <option key={variant.id} value={variant.id}>
          {variant.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Three steps, all from the browser: ask for a presigned URL, PUT the file to
 * S3, then save the key. The file never passes through our server.
 */
function UploadForm({
  productId,
  productName,
  variants,
}: {
  productId: number;
  productName: string;
  variants: VariantChoice[];
}) {
  const [state, action, pending] = useActionState(async (_prev: ImageActionState, formData: FormData) => {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, field: "file", message: "Pick an image." } as const;
    const problem = fileProblem(file);
    if (problem) return { ok: false, field: "file", message: problem } as const;
    const alt = String(formData.get("alt") ?? "");
    if (!normalizeAlt(alt)) {
      return { ok: false, field: "alt", message: `Describe the image (up to ${MAX_ALT_LENGTH} characters).` } as const;
    }

    const upload = await requestImageUploadAction({ productId, contentType: file.type, size: file.size });
    if (!upload.ok) return upload;

    try {
      const response = await fetch(upload.target.url, { method: "PUT", headers: upload.target.headers, body: file });
      if (!response.ok) {
        return { ok: false, field: "file", message: `Image storage refused the upload (${response.status}). Try again.` } as const;
      }
    } catch {
      // A CORS refusal looks like a network error: uploads only work from
      // origins the bucket allows (localhost and www, not previews).
      return { ok: false, field: "file", message: "Couldn't reach image storage from this site. Try again." } as const;
    }

    return saveImageAction({ productId, key: upload.target.key, alt, variantId: String(formData.get("variantId") ?? "") });
  }, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-[#9AA1AB] sm:col-span-2">
          Image
          <input
            name="file"
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            required
            className="text-sm text-[#F2F3F4] file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-[#2A2F36] file:bg-transparent file:px-3 file:py-1.5 file:text-[#F2F3F4] hover:file:bg-[#2A2F36]"
          />
          <span className="text-xs">JPEG, PNG, or WebP, up to 10 MB.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#9AA1AB]">
          Alt text
          <input name="alt" type="text" required maxLength={MAX_ALT_LENGTH} defaultValue={productName} className={FIELD} />
          <span className="text-xs">What the image shows, for screen readers and search.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#9AA1AB]">
          Shows for
          <VariantSelect variants={variants} defaultValue={null} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? "Uploading…" : "Upload"}
        </button>
        {state?.ok && (
          <p role="status" className="text-sm text-emerald-300">
            Image added.
          </p>
        )}
        {state && !state.ok && (
          <p role="alert" className="text-sm text-red-300">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

function EditForm({
  image,
  variants,
  onDone,
}: {
  image: ImageTile;
  variants: VariantChoice[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: ImageActionState, formData: FormData) => {
    const result = await updateImageAction(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="imageId" value={image.id} />
      <label className="flex flex-col gap-1 text-xs text-[#9AA1AB]">
        Alt text
        <input name="alt" type="text" required maxLength={MAX_ALT_LENGTH} defaultValue={image.alt} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#9AA1AB]">
        Shows for
        <VariantSelect variants={variants} defaultValue={image.variantId} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={SMALL_BUTTON}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" disabled={pending} onClick={onDone} className={SMALL_BUTTON}>
          Cancel
        </button>
      </div>
      <ErrorText state={state} />
    </form>
  );
}

function Tile({
  image,
  index,
  count,
  variants,
}: {
  image: ImageTile;
  index: number;
  count: number;
  variants: VariantChoice[];
}) {
  const [editing, setEditing] = useState(false);
  const [moveState, move, moving] = useActionState(moveImageAction, null);
  const [deleteState, remove, deleting] = useActionState(deleteImageAction, null);
  const busy = moving || deleting;
  const variantLabel = variants.find((variant) => variant.id === image.variantId)?.label;

  return (
    <li className={`flex flex-col gap-2 rounded-lg border border-[#2A2F36] p-2 ${busy ? "opacity-60" : ""}`}>
      <div className="relative aspect-square overflow-hidden rounded-md bg-[#0F1114]">
        <Image src={image.url} alt={image.alt} fill sizes="200px" className="object-cover" />
        {index === 0 && (
          <span className="absolute left-1 top-1 rounded bg-[#16191E]/90 px-1.5 py-0.5 text-xs text-[#F2F3F4]">Main</span>
        )}
      </div>

      {editing ? (
        <EditForm image={image} variants={variants} onDone={() => setEditing(false)} />
      ) : (
        <>
          <p className="line-clamp-2 text-xs text-[#F2F3F4]" title={image.alt}>
            {image.alt}
          </p>
          <p className="text-xs text-[#9AA1AB]">{variantLabel ?? "All variants"}</p>
          <div className="flex flex-wrap gap-1">
            <form action={move}>
              <input type="hidden" name="imageId" value={image.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" disabled={busy || index === 0} aria-label="Move earlier" className={SMALL_BUTTON}>
                ↑
              </button>
            </form>
            <form action={move}>
              <input type="hidden" name="imageId" value={image.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" disabled={busy || index === count - 1} aria-label="Move later" className={SMALL_BUTTON}>
                ↓
              </button>
            </form>
            <button type="button" disabled={busy} onClick={() => setEditing(true)} className={SMALL_BUTTON}>
              Edit
            </button>
            <form
              action={remove}
              onSubmit={(event) => {
                if (!window.confirm("Delete this image? This can't be undone.")) event.preventDefault();
              }}
            >
              <input type="hidden" name="imageId" value={image.id} />
              <button type="submit" disabled={busy} className={`${SMALL_BUTTON} text-red-300`}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </form>
          </div>
          <ErrorText state={moveState} />
          <ErrorText state={deleteState} />
        </>
      )}
    </li>
  );
}

export default function Images({
  productId,
  productName,
  images,
  variants,
}: {
  productId: number;
  productName: string;
  images: ImageTile[];
  variants: VariantChoice[];
}) {
  const full = images.length >= MAX_IMAGES_PER_PRODUCT;

  return (
    <div className="flex flex-col gap-6">
      {images.length === 0 ? (
        <p className="text-sm text-[#9AA1AB]">No images yet. The first one is the main image on the storefront.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image, index) => (
            <Tile key={image.id} image={image} index={index} count={images.length} variants={variants} />
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-[#9AA1AB]">
          {MAX_IMAGES_PER_PRODUCT} images is the limit. Delete one to add another.
        </p>
      ) : (
        <div className="border-t border-[#2A2F36] pt-4">
          <h3 className="mb-3 text-sm font-medium text-[#F2F3F4]">Add an image</h3>
          <UploadForm productId={productId} productName={productName} variants={variants} />
        </div>
      )}
    </div>
  );
}
