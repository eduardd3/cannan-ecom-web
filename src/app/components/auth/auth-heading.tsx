import GoldRule from "@/app/components/gold-rule";

type AuthHeadingProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

//  Eyebrow, serif title, italic subtitle and gold rule at the top of each
//  /id form. The headline tokens shrink below md on their own (globals.css).
export default function AuthHeading({ eyebrow, title, subtitle }: AuthHeadingProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-2 text-label-eyebrow text-gold-ink uppercase">{eyebrow}</p>
      <h1 className="mb-1 font-serif text-headline-lg text-charcoal">{title}</h1>
      <p className="font-serif text-headline-md font-normal text-stone italic">{subtitle}</p>
      <GoldRule className="mt-4 mb-8" />
    </div>
  );
}
