import Container from "@/app/components/container";

//  TODO(copy): each promise's body is a placeholder; `body` says what it should cover.
const promises = [
  {
    title: "Chosen with intention",
    body: "Every piece earns its place. We look for careful detail, a faithful likeness, and real value for what you pay.",
  },
  {
    title: "Respect for every tradition",
    body: "Each collection keeps its own space, presented with the care and dignity its community deserves.",
  },
  {
    title: "Honest descriptions",
    body: "We show and describe each piece as it is. Small variations in paint and finish are natural, part of what makes it yours.",
  },
  {
    title: "Care in every order",
    body: "Every order is packed carefully, whether it's for your own altar or for someone you love.",
  },
];

export default function Promises() {
  return (
    <section aria-labelledby="promises-heading">
      <Container className="py-16 md:py-24">
        <h2 id="promises-heading" className="sr-only">Our promises</h2>
        <ol className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-6">
          {promises.map(({ title, body }, i) => (
            <li key={title} className="flex flex-col md:pr-4">
              <span aria-hidden="true" className="mb-3 text-label-eyebrow text-gold-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mb-3 font-serif text-headline-md text-charcoal">{title}</h3>
              <p className="text-body-md text-stone">{body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
