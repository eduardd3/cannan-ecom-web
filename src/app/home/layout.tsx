import type { Metadata } from "next";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";

//  reserved name
export const metadata: Metadata = {
  title: "CANNAN",
  description: "California LLC · Est. 2022",
};

//  Nested layout: root layout (app/layout.tsx) already renders <html>/<body>,
//  so this only wraps the home segment's content.
export default function HomeLayout({
  children, //  children -> content of the page
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full flex flex-col">
      <SiteHeader />
      <div className="flex-1">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}