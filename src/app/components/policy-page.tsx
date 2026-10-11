import Container from "@/app/components/container";

type PolicyPageProps = {
  title: string;
  //  Shown as "Last updated"; bump it whenever the policy's terms change.
  updated?: string;
  children: React.ReactNode;
};

//  Shared shell for the text pages (about, contact, policies). There is no
//  typography plugin, so the arbitrary [&_tag] variants style the plain
//  h2/p/ul/a a page passes in, and pages stay free of per-element classes.
export default function PolicyPage({ title, updated, children }: PolicyPageProps) {
  return (
    <Container className="py-10">
      <article
        className="max-w-2xl leading-relaxed text-[#16191E] [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_hr]:mt-10 [&_hr]:mb-8[&_hr]:border-neutral-300 [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6"
      >
        <h1 className="text-2xl font-semibold">{title}</h1>
        {updated && <p className="text-sm text-neutral-600">Last updated {updated}</p>}
        {children}
      </article>
    </Container>
  );
}
