import Container from "@/app/components/container";
import GoldRule from "@/app/components/gold-rule";

//  Shown while a collection renders. The page is dynamic, so without this
//  boundary <Link> prefetches nothing and a click waits on the server with the
//  old page still up. Mirrors the page's spacing so the swap doesn't jump: the
//  closed filter and sort rows and the count line on mobile, the count and
//  sort row on desktop. The name isn't known yet, so the H1 is a placeholder
//  bar.
export default function Loading() {
  return (
    <Container className="pt-8 pb-16 md:pt-12 md:pb-24">
      <div aria-busy="true" aria-label="Loading collection">
        <div className="mb-6 md:mb-8">
          <p className="mb-2 text-label-eyebrow text-gold-ink uppercase">
            <span lang="es">La colección</span>
          </p>
          <div className="mb-3 h-10 w-64 max-w-full animate-pulse bg-linen md:mb-4" />
          <GoldRule />
        </div>
        <div className="mb-6 h-5 w-72 max-w-full animate-pulse bg-linen md:mb-12" />

        <div className="mb-6 divide-y divide-hairline md:hidden">
          {["w-12", "w-20", "w-16"].map((width) => (
            <div key={width} className="flex min-h-13 animate-pulse items-center justify-between">
              <div className={`h-4 ${width} bg-linen`} />
              <div className="h-4 w-14 bg-linen" />
            </div>
          ))}
        </div>
        <div className="mb-4 h-4 w-20 animate-pulse bg-linen md:hidden" />
        <div className="mb-8 hidden min-h-11 animate-pulse items-center justify-between md:flex">
          <div className="h-5 w-24 bg-linen" />
          <div className="h-5 w-40 bg-linen" />
        </div>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-12">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className="animate-pulse">
              <div className="mb-3 aspect-square w-full bg-linen md:mb-4" />
              <div className="mb-1 h-6 w-3/4 bg-linen" />
              <div className="h-4 w-1/4 bg-linen" />
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
