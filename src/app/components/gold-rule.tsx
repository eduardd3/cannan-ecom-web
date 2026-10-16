//  The short antique-gold line the storefront design uses as a divider under
//  brand and section headings. Decorative only, so hidden from screen readers.
//  className is appended last for spacing (e.g. "mb-4").
export default function GoldRule({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`h-px w-12 bg-antique-gold ${className}`} />;
}
