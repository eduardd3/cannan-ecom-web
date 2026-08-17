import type { Metadata } from "next";
import { Geist, Geist_Mono, Archivo} from "next/font/google";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

//  reserved name
export const metadata: Metadata = {
  title: "CANNAN",
  description: "California LLC · Est. 2022",
};


export default function RootLayout({
  children, //  children -> content of the page 
}: Readonly<{
  children: React.ReactNode;
}>) {
  //  Renders HTML body tag aka general HTML skeleton
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
      <SiteHeader />
      <main className='flex-1'>
        {children}
      </main>
      <SiteFooter />
      </body>
    </html>
  );
}