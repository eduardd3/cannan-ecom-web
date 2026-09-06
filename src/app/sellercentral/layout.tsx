import type { Metadata } from "next";
//  import SiteFooter from "../components/site-footer";
import SellerCentralSiteFooter from "../components/sc-site-footer"; 
//  reserved name
export const metadata: Metadata = {
  title: "Cannan Seller Central",
  description: "Seller dashboard login",
};

//  Nested layout: root layout (app/layout.tsx) already renders <html>/<body>,
//  so this only wraps the sellercentral segment's content.
export default function SellerCentralLayout({
  children, //  children -> content of the page
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full flex flex-col">
      <div className="grid flex-1 content-center">
        {children}
      </div>
      <SellerCentralSiteFooter />
      {/*<SiteFooter /> */}
    </div>
  );
}
