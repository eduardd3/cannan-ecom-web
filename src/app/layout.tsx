import type { Metadata } from "next";
import { DM_Sans, EB_Garamond, Geist_Mono } from "next/font/google";
import { SITE_ORIGIN } from "@/lib/seo/site";
import "./globals.css";

//  DM Sans is the site font: globals.css maps --font-sans to it, so it is
//  inherited everywhere and needs no utility class. EB Garamond is the
//  storefront's display serif (`font-serif`). Geist Mono stays for
//  `font-mono` (order numbers, SKUs). All three are variable fonts, so one
//  file per family covers every weight the type scale uses.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

//  latin-ext and vietnamese too: the Yoruba "Àṣẹ" on the Orishas collection
//  card needs ṣ (latin-ext) and ẹ (vietnamese range). Without them those two
//  letters fall back to another font. The browser only downloads a subset's
//  file when a page uses one of its characters.
const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "latin-ext", "vietnamese"],
  style: ["normal", "italic"],
});
//  Fallback only — this applies to any page that sets no title of its own,
//  including the admin and identity areas. Keep it brand-generic; pages that
//  want a specific title set their own.
//
//  metadataBase turns relative metadata URLs (canonical, og:url) into absolute
//  ones, on the www host (see lib/seo/site).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: "Cannan",
};


export default function RootLayout({
  children, //  children -> content of the page
}: Readonly<{
  children: React.ReactNode;
}>) {
  //  Skeleton only. No <main> here on purpose: this layout wraps the storefront,
  //  identity and admin areas alike, and each of those renders its own chrome.
  //  A <main> at this level would swallow their <header>/<footer> as page
  //  content and nest inside the <main> the admin layout already has.
  //
  //  min-h-dvh on the body instead of an h-full chain through <html>: the old
  //  version only worked as long as every layout below it agreed to pass a
  //  percentage height down, and collapsed silently when one didn't.
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${dmSans.variable} ${ebGaramond.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}