import type { ReactNode } from "react";

//  Typographic placeholders for the collection cards until Collection has an
//  image field: each devotion's own name, set like a title page. Keyed by
//  slug (the same slugs as SHOP_COLLECTIONS in site-footer.tsx). A collection
//  without an entry gets the plain linen box.
//
//  TODO(copy): confirm the wording with each community (Àṣẹ vs. Aché,
//  Santísima Muerte vs. La Santa Muerte).
type Art = {
  numeral: string;
  title: ReactNode;
  titleLang: string;
  //  Full class strings, so Tailwind's scanner finds them.
  titleSize: string;
  subline: string;
};

const ART: Record<string, Art> = {
  signature: {
    numeral: "I",
    title: <>Nuestra<br />Señora</>,
    titleLang: "es",
    titleSize: "text-[16cqw]",
    subline: "de Guadalupe",
  },
  orishas: {
    numeral: "II",
    title: "Àṣẹ",
    titleLang: "yo",
    titleSize: "text-[28cqw]",
    subline: "Aché · los siete Orishas",
  },
  "santa-muerte": {
    numeral: "III",
    title: <>La Niña<br />Blanca</>,
    titleLang: "es",
    titleSize: "text-[16cqw]",
    subline: "Santísima Muerte",
  },
};

//  Sizes are in cqw (percent of the card's width, via @container), so the
//  composition scales as one piece from the 358px phone card to the ~384px
//  desktop one, like an image would. Decorative: the card's <h3> names the
//  collection, so screen readers skip this.
export default function CollectionArt({ slug }: { slug: string }) {
  const art = ART[slug];

  return (
    <div aria-hidden="true" className="@container mb-6 aspect-4/5 w-full bg-linen">
      {art && (
        <div className="flex h-full flex-col items-center text-center">
          <p className="mt-[27cqw] text-[3cqw] leading-none font-medium tracking-[0.3em] text-gold-ink">{art.numeral}</p>
          <span className="mt-[5cqw] h-px w-[12cqw] bg-antique-gold" />
          <p lang={art.titleLang} className={`flex flex-1 items-center font-serif leading-[1.06] text-charcoal italic ${art.titleSize}`}>
            <span>{art.title}</span>
          </p>
          <p lang="es" className="mb-[24cqw] font-serif text-[5cqw] leading-tight text-stone">{art.subline}</p>
        </div>
      )}
    </div>
  );
}
