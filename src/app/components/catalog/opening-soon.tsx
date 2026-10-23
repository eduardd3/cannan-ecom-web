import Container from "@/app/components/container";
import CollectionHeading from "./collection-heading";

//  /products and every /collections page while the catalog is off (or there's
//  no default collection). Static: rendering it touches no database.
export default function OpeningSoon() {
  return (
    <Container className="pt-8 pb-16 md:pt-12 md:pb-24">
      <CollectionHeading title="The shop opens soon" />
      <p className="text-body-md text-stone">Our pieces aren&apos;t available here yet. Please check back soon.</p>
    </Container>
  );
}
