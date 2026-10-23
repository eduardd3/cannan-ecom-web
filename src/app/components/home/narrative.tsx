import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";

//  Full-width linen band: the background spans the viewport, so Container sits
//  inside the section instead of around it.
export default function Narrative() {
  return (
    <section className="my-12 bg-linen">
      <Container className="flex flex-col items-center py-16 text-center md:py-24">
        <div className="flex max-w-200 flex-col items-center">
          <p lang="es" className="mb-3 text-label-eyebrow text-gold-ink uppercase">
            Nuestro propósito
          </p>
          <h2 lang="es" className="mb-2 font-serif text-headline-lg text-charcoal">
            Muchos caminos, un hogar
          </h2>
          <p className="mb-8 font-serif text-headline-md text-stone italic">
            Many paths, one home
          </p>
          <GoldRule className="mb-8" />
          {/* TODO(copy): narrative paragraph. */}
          <p className="max-w-170 text-body-lg text-charcoal">
            We believe devotional objects are not mere decor – they are vessels of memory, prayer, and quiet gratitude. Cannan welcomes every seeker, honoring the distinct lineage and sacred rites of each tradition with dignity and room to breathe. 
          </p>
        </div>
      </Container>
    </section>
  );
}
