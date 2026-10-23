import GoldRule from "@/app/components/gold-rule";

//  Eyebrow, H1 and gold rule at the top of the collection pages and their
//  Opening soon state. Left-aligned, unlike PageHeading's centered /id one.
export default function CollectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-6 md:mb-8">
      <p className="mb-2 text-label-eyebrow text-gold-ink uppercase">
        <span lang="es">La colección</span>
      </p>
      <h1 className="mb-3 font-serif text-headline-lg text-charcoal md:mb-4">{title}</h1>
      <GoldRule />
    </div>
  );
}
