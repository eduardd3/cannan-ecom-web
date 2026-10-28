import type { Metadata } from "next";
import Link from "next/link";

import { getProductFormOptions } from "@/lib/products/queries";
import { requireStaff } from "@/lib/session";
import ProductForm from "../product-form";

export const metadata: Metadata = {
  title: "New product | Cannan Portal",
  robots: { index: false },
};

export default async function NewProductPage() {
  await requireStaff();
  const options = await getProductFormOptions();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link href="/adm/products" className="text-sm text-adm-muted underline-offset-2 hover:underline">
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-adm-fg">New product</h1>
        <p className="mt-1 text-sm text-adm-muted">
          Saved as a draft. Add variants and images on the next page, then list it.
        </p>
      </div>
      <ProductForm options={options} />
    </div>
  );
}
