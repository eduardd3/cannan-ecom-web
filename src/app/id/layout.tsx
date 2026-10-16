import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

//  Same 1200px as Container, but with the auth mockups' 16px/24px gutters.
//  Not Container itself: overriding its px-5 with px-4 via className would
//  depend on CSS order, not class order.
const shell = "mx-auto w-full max-w-300 px-4 md:px-6";

const footerLink = "transition-colors hover:text-charcoal";

//  Nested layout: root layout (app/layout.tsx) already renders <html>/<body>
//  as a min-h-dvh flex column, so flex-1 here stretches the shell to the
//  viewport and keeps the footer at the bottom on short pages. No site
//  header/footer: /id is outside the (storefront) group on purpose.
export default function IdentityLayout({
  children, //  children -> content of the page
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 flex-col bg-gallery-white text-charcoal">
      <header className="shrink-0 border-b border-hairline/60">
        {/* 1fr | auto | 1fr: the side columns are always equal, so the
            wordmark stays truly centered however wide the back link is. */}
        <div className={`${shell} grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20`}>
          {/* One link for both sizes: the text only shows from md up, and
              aria-label gives the arrow-only mobile version its name. */}
          <Link
            href="/"
            lang="es"
            aria-label="Volver a la tienda"
            className="inline-flex items-center gap-1.5 justify-self-start text-label-ui text-charcoal transition-colors hover:text-stone md:text-stone md:hover:text-charcoal"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-5 md:size-4" />
            <span className="hidden md:inline">Volver a la tienda</span>
          </Link>

          <Link href="/" className="font-serif text-wordmark text-charcoal uppercase">
            CANNAN
          </Link>

          <div aria-hidden="true" />
        </div>
      </header>

      <main className={`${shell} flex flex-1 flex-col items-center justify-center py-6 md:py-12`}>
        {children}
      </main>

      <footer className="shrink-0 border-t border-hairline/60 py-4">
        <p className={`${shell} text-center text-caption text-stone`}>
          © {new Date().getFullYear()} Cannan. All rights reserved. ·{" "}
          <Link href="/terms" className={footerLink}>Terms</Link> ·{" "}
          <Link href="/privacy" className={footerLink}>Privacy</Link> ·{" "}
          <span className="text-gold-ink italic">
            For you and yours · <span lang="es">Para ti y los tuyos</span>
          </span>
        </p>
      </footer>
    </div>
  );
}
