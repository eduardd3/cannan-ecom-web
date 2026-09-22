import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";

//  Route group: the "(storefront)" folder name is stripped from the URL, so
//  this layout wraps public shop pages without adding a path segment. Pages
//  that should NOT get the site chrome (console, identity) stay outside it.
//
//  No metadata here on purpose — a title set at this level would become the
//  fallback for every page added to the group later. Each page sets its own.
export default function StorefrontLayout({
  children, //  children -> content of the page
}: Readonly<{
  children: React.ReactNode;
}>) {
  //  <main> lives here rather than in the root layout so it contains only the
  //  page content — the header and footer are siblings of it, not children.
  //
  //  min-h-dvh + flex-1 is what pins the footer to the bottom of the viewport
  //  on a short page and pushes it down on a long one. <main> is itself a flex
  //  column so that a page can stretch into the leftover space with flex-1 and
  //  center itself there; see the note in components/container.tsx.
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}