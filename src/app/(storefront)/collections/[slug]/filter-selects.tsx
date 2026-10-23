"use client";

import { useRouter } from "next/navigation";

import SelectField from "@/app/components/form/select-field";
import { collectionHref, type FilterGroup, type Filters } from "@/lib/catalog/listing";

type FilterSelectsProps = {
  collectionSlug: string;
  filters: Filters;
  groups: { key: keyof Filters; group: FilterGroup }[];
};

//  The mobile filters: the desktop link groups as stacked selects. A change
//  navigates at once, keeping the other group's selection, so these need JS;
//  a no-JS fallback would need an Apply button the design doesn't have.
export default function FilterSelects({ collectionSlug, filters, groups }: FilterSelectsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ key, group }) => (
        <SelectField
          key={key}
          id={`filter-${key}`}
          label={group.label}
          value={group.selected ?? ""}
          options={group.options.map((option) => ({ value: option.slug ?? "", label: option.name }))}
          onChange={(event) =>
            router.push(collectionHref(collectionSlug, { ...filters, [key]: event.target.value || null }), {
              scroll: false,
            })
          }
        />
      ))}
    </div>
  );
}
